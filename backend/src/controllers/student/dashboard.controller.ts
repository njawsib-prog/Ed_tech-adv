import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface StudentRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Get student dashboard data
export const getStudentDashboard = async (req: StudentRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Get today's assigned tests (due today, not submitted)
    const { data: todayTests } = await supabaseAdmin
      .from('test_assignments')
      .select(`
        id,
        tests (
          id,
          title,
          time_limit_mins,
          courses (name)
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .gte('created_at', today.toISOString());

    // Get upcoming tests (next 7 days, scheduled)
    const { data: upcomingTests } = await supabaseAdmin
      .from('test_assignments')
      .select(`
        id,
        tests (
          id,
          title,
          time_limit_mins,
          scheduled_at,
          courses (name)
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .gte('tests.scheduled_at', today.toISOString())
      .lte('tests.scheduled_at', weekFromNow.toISOString())
      .limit(5);

    // Get last 3 results
    const { data: recentResults } = await supabaseAdmin
      .from('results')
      .select(`
        id,
        score,
        total,
        accuracy,
        submitted_at,
        tests (title)
      `)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })
      .limit(3);

    // Get stats
    const { count: totalTests } = await supabaseAdmin
      .from('results')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId);

    const { data: avgScoreData } = await supabaseAdmin
      .from('results')
      .select('accuracy')
      .eq('student_id', studentId);

    const avgScore = avgScoreData && avgScoreData.length > 0
      ? avgScoreData.reduce((sum, r) => sum + (r.accuracy || 0), 0) / avgScoreData.length
      : 0;

    const { data: bestScoreData } = await supabaseAdmin
      .from('results')
      .select('accuracy')
      .eq('student_id', studentId)
      .order('accuracy', { ascending: false })
      .limit(1);

    // Calculate streak (consecutive days with submissions)
    const { data: allResults } = await supabaseAdmin
      .from('results')
      .select('submitted_at')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    let streak = 0;
    if (allResults && allResults.length > 0) {
      const uniqueDays = new Set(
        allResults.map((r) => new Date(r.submitted_at).toDateString())
      );
      streak = uniqueDays.size;
    }

    res.json({
      todayTests: todayTests || [],
      upcomingTests: upcomingTests || [],
      recentResults: recentResults || [],
      stats: {
        totalTests: totalTests || 0,
        avgScore: Math.round(avgScore * 10) / 10,
        bestScore: bestScoreData?.[0]?.accuracy || 0,
        streak,
      },
    });
  } catch (error) {
    console.error('Get student dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default { getStudentDashboard };