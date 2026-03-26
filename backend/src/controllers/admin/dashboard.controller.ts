import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

// Get dashboard statistics
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get total students count
    const { count: totalStudents } = await supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get active students (logged in today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: activeStudents } = await supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('last_login', today.toISOString());

    // Get tests conducted this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { count: testsThisWeek } = await supabaseAdmin
      .from('results')
      .select('*', { count: 'exact', head: true })
      .gte('submitted_at', weekAgo.toISOString());

    // Get average score this week
    const { data: avgScoreData } = await supabaseAdmin
      .from('results')
      .select('accuracy')
      .gte('submitted_at', weekAgo.toISOString());

    const avgScore = avgScoreData && avgScoreData.length > 0
      ? avgScoreData.reduce((sum, r) => sum + (r.accuracy || 0), 0) / avgScoreData.length
      : 0;

    // Get recent activity
    const { data: recentActivity } = await supabaseAdmin
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    res.json({
      totalStudents: totalStudents || 0,
      activeStudents: activeStudents || 0,
      testsThisWeek: testsThisWeek || 0,
      avgScore: Math.round(avgScore * 10) / 10,
      recentActivity: recentActivity || [],
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getDashboardStats,
};