import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Get student's results
export const getMyResults = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

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
        tests (
          id,
          title,
          total_marks,
          passing_marks,
          time_limit_mins,
          subject
        )
      `)
      .eq('student_id', studentId)
      .eq('assignment_status', 'completed')
      .order('submitted_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Get my results error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch results' });
  }
};

// Get detailed result by ID
export const getResultDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;

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
          time_limit_mins
        )
      `)
      .eq('id', id)
      .eq('student_id', studentId)
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'Result not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get result details error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch result details' });
  }
};

// Get student's performance summary
export const getMyPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

    // Get all completed results
    const { data: results, error } = await supabaseAdmin
      .from('results')
      .select(`
        score,
        total_marks,
        percentage,
        status,
        tests (
          subject
        )
      `)
      .eq('student_id', studentId)
      .eq('assignment_status', 'completed');

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    const totalTests = results?.length || 0;
    const passedTests = results?.filter(r => r.status === 'passed').length || 0;
    const averagePercentage = totalTests > 0
      ? results!.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalTests
      : 0;

    // Subject-wise performance
    const subjectPerformance: Record<string, { total: number; passed: number; avgPercentage: number }> = {};
    results?.forEach(r => {
      const subjectName = r.tests?.subject || 'Unknown';
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
      success: true,
      data: {
        totalTests,
        passedTests,
        passRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
        averagePercentage,
        subjectPerformance,
      },
    });
  } catch (error) {
    console.error('Get my performance error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performance' });
  }
};
