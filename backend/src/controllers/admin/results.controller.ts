import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    instituteId: string;
  };
}

// Get all results with filtering and pagination
export const getResults = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
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
        time_taken_seconds,
        submitted_at,
        started_at,
        tests (
          id,
          title,
          total_marks as test_total_marks,
          passing_marks
        ),
        students (
          id,
          name,
          email,
          roll_number
        )
      `, { count: 'exact' })
      .eq('institute_id', instituteId);

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

    // Apply sorting
    query = query.order(sortBy as string, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      results: data,
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
    const instituteId = req.user?.instituteId;

    const { data, error } = await supabaseAdmin
      .from('results')
      .select(`
        id,
        score,
        total_marks,
        percentage,
        status,
        time_taken_seconds,
        submitted_at,
        started_at,
        answers,
        tests (
          id,
          title,
          total_marks,
          passing_marks,
          duration_minutes,
          questions
        ),
        students (
          id,
          name,
          email,
          roll_number
        )
      `)
      .eq('id', id)
      .eq('institute_id', instituteId)
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
    const instituteId = req.user?.instituteId;

    // Get test details
    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('id, title, total_marks, passing_marks, questions')
      .eq('id', testId)
      .eq('institute_id', instituteId)
      .single();

    if (testError || !test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Get all results for this test
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('results')
      .select('score, percentage, time_taken_seconds, status, answers')
      .eq('test_id', testId)
      .eq('institute_id', instituteId);

    if (resultsError) {
      return res.status(400).json({ error: resultsError.message });
    }

    // Calculate statistics
    const totalAttempts = results?.length || 0;
    const passedAttempts = results?.filter(r => r.status === 'passed').length || 0;
    const averageScore = results?.length 
      ? results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length 
      : 0;
    const averagePercentage = results?.length 
      ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length 
      : 0;
    const averageTime = results?.filter(r => r.time_taken_seconds).length
      ? results.filter(r => r.time_taken_seconds).reduce((sum, r) => sum + (r.time_taken_seconds || 0), 0) / results.filter(r => r.time_taken_seconds).length
      : 0;

    // Calculate question-wise statistics
    const questions = test.questions as any[] || [];
    const questionStats = questions.map((q, index) => {
      const correctCount = results?.filter(r => {
        const answers = r.answers as any[];
        return answers?.[index]?.selected === q.correctAnswer;
      }).length || 0;

      return {
        questionNumber: index + 1,
        correctResponses: correctCount,
        totalResponses: totalAttempts,
        accuracy: totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0,
        difficulty: totalAttempts > 0 && (correctCount / totalAttempts) < 0.4 ? 'hard' :
                   totalAttempts > 0 && (correctCount / totalAttempts) > 0.7 ? 'easy' : 'medium'
      };
    });

    // Score distribution
    const scoreRanges = [
      { range: '0-20', count: 0 },
      { range: '21-40', count: 0 },
      { range: '41-60', count: 0 },
      { range: '61-80', count: 0 },
      { range: '81-100', count: 0 }
    ];

    results?.forEach(r => {
      const pct = r.percentage || 0;
      if (pct <= 20) scoreRanges[0].count++;
      else if (pct <= 40) scoreRanges[1].count++;
      else if (pct <= 60) scoreRanges[2].count++;
      else if (pct <= 80) scoreRanges[3].count++;
      else scoreRanges[4].count++;
    });

    res.json({
      test: {
        id: test.id,
        title: test.title,
        totalMarks: test.total_marks,
        passingMarks: test.passing_marks
      },
      summary: {
        totalAttempts,
        passedAttempts,
        passRate: totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0,
        averageScore,
        averagePercentage,
        averageTimeSeconds: averageTime
      },
      questionStats,
      scoreDistribution: scoreRanges
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
    const instituteId = req.user?.instituteId;

    // Verify student belongs to institute
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, name, email, roll_number')
      .eq('id', studentId)
      .eq('institute_id', instituteId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get all results for the student
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
          subject_id,
          subjects (name)
        )
      `)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    if (resultsError) {
      return res.status(400).json({ error: resultsError.message });
    }

    // Calculate overall statistics
    const totalTests = results?.length || 0;
    const passedTests = results?.filter(r => r.status === 'passed').length || 0;
    const averagePercentage = results?.length
      ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length
      : 0;

    // Subject-wise performance
    const subjectPerformance: Record<string, { total: number; passed: number; avgPercentage: number }> = {};
    results?.forEach(r => {
      const subjectName = (r.tests as any)?.subjects?.name || 'Unknown';
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = { total: 0, passed: 0, avgPercentage: 0 };
      }
      subjectPerformance[subjectName].total++;
      if (r.status === 'passed') subjectPerformance[subjectName].passed++;
      subjectPerformance[subjectName].avgPercentage += r.percentage || 0;
    });

    Object.keys(subjectPerformance).forEach(subject => {
      subjectPerformance[subject].avgPercentage /= subjectPerformance[subject].total;
    });

    res.json({
      student,
      summary: {
        totalTests,
        passedTests,
        passRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
        averagePercentage
      },
      results,
      subjectPerformance
    });
  } catch (error) {
    console.error('Get student performance error:', error);
    res.status(500).json({ error: 'Failed to fetch student performance' });
  }
};

// Export results to CSV
export const exportResultsCSV = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
    const { testId, status } = req.query;

    let query = supabaseAdmin
      .from('results')
      .select(`
        id,
        score,
        total_marks,
        percentage,
        status,
        time_taken_seconds,
        submitted_at,
        tests (title),
        students (name, email, roll_number)
      `)
      .eq('institute_id', instituteId);

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

    // Generate CSV
    const headers = [
      'Student Name',
      'Roll Number',
      'Email',
      'Test Title',
      'Score',
      'Total Marks',
      'Percentage',
      'Status',
      'Time Taken (minutes)',
      'Submitted At'
    ];

    const rows = data?.map(r => [
      (r.students as any)?.name || '',
      (r.students as any)?.roll_number || '',
      (r.students as any)?.email || '',
      (r.tests as any)?.title || '',
      r.score || 0,
      r.total_marks || 0,
      r.percentage?.toFixed(2) || '0',
      r.status || '',
      r.time_taken_seconds ? Math.floor(r.time_taken_seconds / 60) : '',
      r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ''
    ]) || [];

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=results-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export results error:', error);
    res.status(500).json({ error: 'Failed to export results' });
  }
};

// Delete a result
export const deleteResult = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;

    const { error } = await supabaseAdmin
      .from('results')
      .delete()
      .eq('id', id)
      .eq('institute_id', instituteId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Result deleted successfully' });
  } catch (error) {
    console.error('Delete result error:', error);
    res.status(500).json({ error: 'Failed to delete result' });
  }
};