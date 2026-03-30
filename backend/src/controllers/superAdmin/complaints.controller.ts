import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

export const getAllComplaints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      branch_id,
      status,
      priority
    } = req.query;

    // In optimized schema, complaints are in notifications table
    let query = supabaseAdmin
      .from('notifications')
      .select(`
        *,
        users!notifications_student_id_fkey (
          id,
          name,
          email,
          branch_id,
          branches (
            id,
            name
          )
        )
      `, { count: 'exact' })
      .eq('type', 'complaint');

    // Apply filters
    if (status) {
      query = query.eq('complaint_status', status);
    }

    if (priority) {
      query = query.eq('priority_level', priority);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
    }

    const from = ((parseInt(page as string) - 1) * parseInt(limit as string));
    const to = from + parseInt(limit as string) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching complaints:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
      return;
    }

    // Filter by branch manually if needed since it's nested or not directly on notification
    let filteredData = data || [];
    if (branch_id) {
      filteredData = filteredData.filter(c => (c as any).users?.branch_id === branch_id);
    }

    res.json({
      success: true,
      data: filteredData,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
  }
};

export const getComplaintById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: complaint, error } = await supabaseAdmin
      .from('notifications')
      .select(`
        *,
        users!notifications_student_id_fkey (
          id,
          name,
          email,
          phone,
          branch_id,
          branches (
            id,
            name
          )
        )
      `)
      .eq('id', id)
      .eq('type', 'complaint')
      .single();

    if (error || !complaint) {
      res.status(404).json({ success: false, error: 'Complaint not found' });
      return;
    }

    res.json({
      success: true,
      data: complaint
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch complaint' });
  }
};

export const resolveComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;

    const adminId = req.user?.id;

    const { data: complaint, error } = await supabaseAdmin
      .from('notifications')
      .update({
        complaint_status: 'resolved',
        new_value: { resolution_notes, resolved_at: new Date().toISOString(), resolved_by: adminId }
      })
      .eq('id', id)
      .eq('type', 'complaint')
      .select()
      .single();

    if (error) {
      console.error('Error resolving complaint:', error);
      res.status(500).json({ success: false, error: 'Failed to resolve complaint' });
      return;
    }

    res.json({
      success: true,
      data: complaint,
      message: 'Complaint resolved successfully'
    });
  } catch (error) {
    console.error('Error resolving complaint:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve complaint' });
  }
};

export const overrideBranchAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const adminId = req.user?.id;

    const { data: complaint, error } = await supabaseAdmin
      .from('notifications')
      .update({
        complaint_status: status,
        new_value: { override_notes: notes, override_by: adminId, override_at: new Date().toISOString() }
      })
      .eq('id', id)
      .eq('type', 'complaint')
      .select()
      .single();

    if (error) {
      console.error('Error overriding branch admin:', error);
      res.status(500).json({ success: false, error: 'Failed to override branch admin' });
      return;
    }

    res.json({
      success: true,
      data: complaint,
      message: 'Complaint status overridden successfully'
    });
  } catch (error) {
    console.error('Error overriding branch admin:', error);
    res.status(500).json({ success: false, error: 'Failed to override branch admin' });
  }
};

export const getComplaintStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: complaints } = await supabaseAdmin
      .from('notifications')
      .select('complaint_status, priority_level, student_id')
      .eq('type', 'complaint');

    const total = complaints?.length || 0;
    const open = complaints?.filter(c => c.complaint_status === 'open').length || 0;
    const inProgress = complaints?.filter(c => c.complaint_status === 'in_progress').length || 0;
    const resolved = complaints?.filter(c => c.complaint_status === 'resolved').length || 0;

    res.json({
      success: true,
      data: {
        total,
        open,
        inProgress,
        resolved
      }
    });
  } catch (error) {
    console.error('Error fetching complaint stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch complaint stats' });
  }
};
