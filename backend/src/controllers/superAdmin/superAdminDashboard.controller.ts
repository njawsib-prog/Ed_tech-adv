import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: branches } = await supabaseAdmin
      .from('branches')
      .select('id');

    const { data: students } = await supabaseAdmin
      .from('users')
      .select('id, created_at')
      .eq('role', 'student');

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const studentsThisMonth = students?.filter(s => {
      const d = new Date(s.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length || 0;

    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthMonth = lastMonth.getMonth();
    const lastMonthYear = lastMonth.getFullYear();

    const studentsLastMonth = students?.filter(s => {
      const d = new Date(s.created_at);
      return d.getMonth() === lastMonthMonth && d.getFullYear() === lastMonthYear;
    }).length || 0;

    const growthRate = studentsLastMonth > 0 
      ? ((studentsThisMonth - studentsLastMonth) / studentsLastMonth) * 100 
      : studentsThisMonth > 0 ? 100 : 0;

    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount, status, created_at');

    const totalRevenue = payments?.reduce((sum, p) => {
      return p.status === 'completed' ? sum + (p.amount || 0) : sum;
    }, 0) || 0;

    const revenueThisMonth = payments?.reduce((sum, p) => {
      const d = new Date(p.created_at);
      return (p.status === 'completed' && d.getMonth() === currentMonth && d.getFullYear() === currentYear) 
        ? sum + (p.amount || 0) : sum;
    }, 0) || 0;

    const { data: courses } = await supabaseAdmin
      .from('courses')
      .select('id, status');

    const activeCourses = courses?.filter(c => c.status === 'active').length || 0;

    const { data: tests } = await supabaseAdmin
      .from('tests')
      .select('id');

    res.json({
      success: true,
      data: {
        totalBranches: branches?.length || 0,
        totalStudents: students?.length || 0,
        studentsThisMonth,
        studentsLastMonth,
        studentGrowthRate: Math.round(growthRate * 100) / 100,
        totalRevenue,
        revenueThisMonth,
        activeCourses,
        totalCourses: courses?.length || 0,
        totalTests: tests?.length || 0,
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
};

export const getStudentGrowth = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { months = 12 } = req.query;

    const { data, error } = await supabaseAdmin.rpc('get_student_growth', {
      months_count: parseInt(months as string)
    });

    if (error) {
      // Fallback query if RPC doesn't exist
      const { data: students } = await supabaseAdmin
        .from('users')
        .select('created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: true });

      const monthlyGrowth = students?.reduce((acc, student) => {
        const month = new Date(student.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      res.json({
        success: true,
        data: Object.entries(monthlyGrowth).map(([month, count]) => ({ month, count }))
      });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching student growth:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch student growth' });
  }
};

export const getRevenueAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { months = 12 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months as string));

    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount, status, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    const monthlyRevenue = payments?.reduce((acc, payment) => {
      if (payment.status === 'completed') {
        const month = new Date(payment.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
        acc[month] = (acc[month] || 0) + (payment.amount || 0);
      }
      return acc;
    }, {} as Record<string, number>) || {};

    res.json({
      success: true,
      data: Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue }))
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch revenue analytics' });
  }
};

export const getAttendanceTrends = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: attendance } = await supabaseAdmin
      .from('attendance')
      .select('status');

    const present = attendance?.filter(a => a.status === 'present').length || 0;
    const absent = attendance?.filter(a => a.status === 'absent').length || 0;
    const late = attendance?.filter(a => a.status === 'late').length || 0;
    const excused = attendance?.filter(a => a.status === 'excused').length || 0;

    res.json({
      success: true,
      data: [
        { label: 'Present', value: present },
        { label: 'Absent', value: absent },
        { label: 'Late', value: late },
        { label: 'Excused', value: excused }
      ]
    });
  } catch (error) {
    console.error('Error fetching attendance trends:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance trends' });
  }
};

export const getPerformanceAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: results } = await supabaseAdmin
      .from('results')
      .select('status');

    const passed = results?.filter(r => r.status === 'passed').length || 0;
    const failed = results?.filter(r => r.status === 'failed').length || 0;
    const pending = results?.filter(r => r.status === 'pending').length || 0;

    const total = passed + failed + pending;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    res.json({
      success: true,
      data: {
        passed,
        failed,
        pending,
        total,
        passRate: Math.round(passRate * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performance analytics' });
  }
};

export const getTopBranches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = 10 } = req.query;

    const { data, error } = await supabaseAdmin
      .from('branch_statistics')
      .select('*')
      .order('total_students', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) {
      console.error('Error fetching top branches:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch top branches' });
      return;
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching top branches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch top branches' });
  }
};
