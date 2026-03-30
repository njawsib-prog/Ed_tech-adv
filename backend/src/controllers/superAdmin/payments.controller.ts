import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

export const getAllPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      branch_id,
      start_date,
      end_date
    } = req.query;

    let query = supabaseAdmin
      .from('payments')
      .select(`
        *,
        students:users!payments_student_id_fkey(
          id,
          name,
          email,
          branch_id
        ),
        branches (
          id,
          name
        )
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const from = ((parseInt(page as string) - 1) * parseInt(limit as string));
    const to = from + parseInt(limit as string) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payments' });
      return;
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
};

export const getPaymentsByBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branch_id } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    let query = supabaseAdmin
      .from('payments')
      .select(`
        *,
        students:users!payments_student_id_fkey(
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .eq('branch_id', branch_id);

    if (status) {
      query = query.eq('status', status);
    }

    const from = ((parseInt(page as string) - 1) * parseInt(limit as string));
    const to = from + parseInt(limit as string) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching branch payments:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch branch payments' });
      return;
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching branch payments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branch payments' });
  }
};

export const getDefaulters = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, branch_id } = req.query;

    // Get students with their payments
    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        branch_id,
        branches (
          id,
          name
        ),
        payments (
          id,
          amount,
          status,
          created_at
        )
      `)
      .eq('role', 'student');

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    const { data: students, error } = await query;

    if (error) {
      console.error('Error fetching defaulters:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch defaulters' });
      return;
    }

    // Filter for students with pending payments
    const defaulters = students?.map(student => {
      const pendingPayments = student.payments?.filter((p: any) => p.status === 'pending') || [];
      const failedPayments = student.payments?.filter((p: any) => p.status === 'failed') || [];
      const totalDue = [...pendingPayments, ...failedPayments].reduce((sum, p) => sum + (p.amount || 0), 0);

      if (totalDue > 0) {
        return {
          ...student,
          pendingAmount: totalDue,
          pendingPaymentCount: pendingPayments.length + failedPayments.length
        };
      }
      return null;
    }).filter(Boolean) || [];

    // Pagination
    const startIndex = ((parseInt(page as string) - 1) * parseInt(limit as string));
    const endIndex = startIndex + parseInt(limit as string);
    const paginatedDefaulters = defaulters.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedDefaulters,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: defaulters.length,
        totalPages: Math.ceil(defaulters.length / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching defaulters:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch defaulters' });
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ success: false, error: 'Failed to verify payment' });
      return;
    }

    res.json({
      success: true,
      data,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
};

export const generateReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        students:users!payments_student_id_fkey(
          id,
          name,
          email
        ),
        branches (
          id,
          name,
          location
        )
      `)
      .eq('id', id)
      .single();

    if (error || !payment) {
      res.status(404).json({ success: false, error: 'Payment not found' });
      return;
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ success: false, error: 'Failed to generate receipt' });
  }
};

export const getPaymentAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branch_id, start_date, end_date } = req.query;

    let query = supabaseAdmin
      .from('payments')
      .select('amount, status, branch_id, created_at');

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: payments } = await query;

    const totalRevenue = payments?.reduce((sum, p) => {
      return p.status === 'completed' ? sum + (p.amount || 0) : sum;
    }, 0) || 0;

    const pendingAmount = payments?.reduce((sum, p) => {
      return p.status === 'pending' ? sum + (p.amount || 0) : sum;
    }, 0) || 0;

    res.json({
      success: true,
      data: {
        totalRevenue,
        pendingAmount,
        totalTransactions: payments?.length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching payment analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment analytics' });
  }
};
