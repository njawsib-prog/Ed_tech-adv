import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';
import { generateCSV } from '../../utils/csvGenerator';

// Get all results with filtering and pagination
export const getResults = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      testId,
      studentId,
      status,
      sortBy = 'submitted_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('results')
      .select(`
        id,
        score,
        total_marks,
        percentage,
        status,
        assignment_status,
        time_taken_seconds,
        submitted_at,
        started_at,
        tests (
          id,
          title,
          total_marks,
          passing_marks
        ),
        students:users!results_student_id_fkey (
          id,
          name,
          email,
          roll_number
        )
      `, { count: 'exact' });

    // Apply filters
    if (testId) {
      query = query.eq('test_id', testId);
    }
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // Sort
    const sortField = (sortBy as string) || 'submitted_at';
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      results: data || [],
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
};

// Get detailed result by ID
export const getResultById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('results')
      .select(`
        id,
        score,
        total_marks,
        percentage,
        status,
        assignment_status,
        time_taken_seconds,
        submitted_at,
        started_at,
        answers,
        tests (
          id,
          title,
          total_marks,
          passing_marks,
          time_limit_mins
        ),
        students:users!results_student_id_fkey (
          id,
          name,
          email,
          roll_number
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Result not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
};

// Get analytics for a specific test
export const getTestAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    // Get test details
    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('id, title, total_marks, passing_marks')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Get all completed results for this test
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('results')
      .select(`
        id,
        score, 
        percentage, 
        time_taken_seconds, 
        status, 
        submitted_at,
        users!results_student_id_fkey (id, name, email, roll_number)
      `)
      .eq('test_id', testId)
      .eq('assignment_status', 'completed');

    if (resultsError) {
      return res.status(400).json({ error: resultsError.message });
    }

    // Calculate statistics
    const totalAttempts = results?.length || 0;
    const passedAttempts = results?.filter(r => r.status === 'passed').length || 0;
    
    const averagePercentage = totalAttempts > 0 
      ? results!.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalAttempts 
      : 0;

    res.json({
      test,
      summary: {
        totalAttempts,
        passedAttempts,
        passRate: totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0,
        averagePercentage: Number(averagePercentage.toFixed(2)),
      },
      results: results || []
    });
  } catch (error) {
    console.error('Get test analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Get student performance history
export const getStudentPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    const { data: student, error: studentError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, roll_number')
      .eq('id', studentId)
      .eq('role', 'student')
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get all completed results for the student
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('results')
      .select(`
        id,
        score,
        total_marks,
        percentage,
        status,
        submitted_at,
        tests (
          id,
          title,
          subject
        )
      `)
      .eq('student_id', studentId)
      .eq('assignment_status', 'completed')
      .order('submitted_at', { ascending: false });

    if (resultsError) {
      return res.status(400).json({ error: resultsError.message });
    }

    res.json({
      student,
      results: results || []
    });
  } catch (error) {
    console.error('Get student performance error:', error);
    res.status(500).json({ error: 'Failed to fetch student performance' });
  }
};

// Export results to CSV
export const exportResultsCSV = async (req: AuthRequest, res: Response) => {
  try {
    const { testId, status } = req.query;

    let query = supabaseAdmin
      .from('results')
      .select(`
        id,
        score,
        total_marks,
        percentage,
        status,
        submitted_at,
        tests (title),
        users!results_student_id_fkey (name, email, roll_number)
      `)
      .eq('assignment_status', 'completed');

    if (testId) {
      query = query.eq('test_id', testId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('submitted_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const exportData = data?.map(r => ({
      Student_Name: (r as any).users?.name || '',
      Roll_Number: (r as any).users?.roll_number || '',
      Email: (r as any).users?.email || '',
      Test_Title: (r as any).tests?.title || '',
      Score: r.score || 0,
      Total_Marks: r.total_marks || 0,
      Percentage: r.percentage?.toFixed(2) || '0',
      Status: r.status || '',
      Submitted_At: r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ''
    })) || [];

    const csv = generateCSV(exportData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=results-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export results error:', error);
    res.status(500).json({ error: 'Failed to export results' });
  }
};

export default {
  getResults,
  getResultById,
  getTestAnalytics,
  getStudentPerformance,
  exportResultsCSV,
};
