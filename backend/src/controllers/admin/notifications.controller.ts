import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Get all notifications
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('type', 'notification');

    if (category) {
      query = query.eq('category', category);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: notifications, error, count } = await query;

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          total: count || 0,
          page: Number(page),
          limit: Number(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

// Create notification
export const createNotification = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { title, message, category, target_audience, target_id, priority, scheduled_at } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        title,
        message,
        type: 'notification',
        category: category || 'announcement',
        target_audience: target_audience || 'all',
        target_id: target_id,
        priority: priority || 'medium',
        scheduled_at: scheduled_at,
        sent_at: scheduled_at ? null : new Date().toISOString(),
        created_by: adminId
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to create notification' });
  }
};

// Update notification
export const updateNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('type', 'notification')
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notification' });
  }
};

// Delete notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('type', 'notification');

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
};

// Get complaints
export const getComplaints = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('notifications')
      .select(`
        *,
        users!notifications_student_id_fkey (
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .eq('type', 'complaint');

    if (status) {
      query = query.eq('complaint_status', status);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      data: {
        complaints: data,
        pagination: {
          total: count || 0,
          page: Number(page),
          limit: Number(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
  }
};

// Resolve complaint
export const resolveComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        complaint_status: 'resolved',
        assigned_to: adminId,
        new_value: { resolution_notes: notes, resolved_at: new Date().toISOString() },
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('type', 'complaint')
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Resolve complaint error:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve complaint' });
  }
};

// Get feedback
export const getFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { data, error, count } = await supabaseAdmin
      .from('notifications')
      .select(`
        *,
        users!notifications_student_id_fkey (
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .eq('type', 'feedback')
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      data: {
        feedback: data,
        pagination: {
          total: count || 0,
          page: Number(page),
          limit: Number(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
  }
};

export default {
  getNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  getComplaints,
  resolveComplaint,
  getFeedback,
};
