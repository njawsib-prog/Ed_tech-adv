import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

// Get dashboard statistics
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const branch_id = req.user?.branch_id;

    // Get total students count
    let studentsQuery = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('is_active', true);
    
    if (branch_id) studentsQuery = studentsQuery.eq('branch_id', branch_id);
    const { count: totalStudents } = await studentsQuery;

    // Get courses
    let coursesQuery = supabaseAdmin
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    if (branch_id) coursesQuery = coursesQuery.eq('branch_id', branch_id);
    const { count: totalCourses } = await coursesQuery;

    // Attendance today
    const today = new Date().toISOString().split('T')[0];
    let attendanceQuery = supabaseAdmin
      .from('attendance')
      .select('status');
    if (branch_id) attendanceQuery = attendanceQuery.eq('branch_id', branch_id);
    attendanceQuery = attendanceQuery.eq('date', today);
    const { data: attendanceData } = await attendanceQuery;
    
    const presentToday = attendanceData?.filter(a => a.status === 'present').length || 0;

    // Revenue this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    
    let revenueQuery = supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', startOfMonth.toISOString());
    if (branch_id) revenueQuery = revenueQuery.eq('branch_id', branch_id);
    const { data: revenueData } = await revenueQuery;
    
    const monthlyRevenue = revenueData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // Recent activity (from notifications table where type=audit)
    let activityQuery = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('type', 'audit')
      .order('created_at', { ascending: false })
      .limit(10);
    // Note: audit logs might not have branch_id directly, but we can filter by user's branch if stored in entity or created_by
    const { data: recentActivity } = await activityQuery;

    res.json({
      success: true,
      data: {
        totalStudents: totalStudents || 0,
        totalCourses: totalCourses || 0,
        presentToday,
        monthlyRevenue,
        recentActivity: recentActivity || [],
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export default {
  getDashboardStats,
};
