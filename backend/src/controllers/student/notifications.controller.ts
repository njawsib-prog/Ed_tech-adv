import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Get student notifications
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // In the optimized schema, notifications, complaints, and feedback are in one table
    // Here we only want actual notifications
    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('type', 'notification')
      .or('target_audience.eq.all,target_audience.eq.students');

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: notifications, error, count } = await query;

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    // Filter and add is_read status based on read_by JSONB array
    const notificationsWithRead = notifications?.map(n => {
      const readBy = n.read_by || [];
      const isRead = readBy.some((r: any) => r.student_id === studentId);
      return {
        ...n,
        is_read: isRead
      };
    });

    const finalData = unreadOnly === 'true' 
      ? notificationsWithRead?.filter(n => !n.is_read) 
      : notificationsWithRead;

    res.json({
      success: true,
      data: {
        notifications: finalData,
        pagination: {
          total: count || 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil((count || 0) / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;

    const { data: notification, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('read_by, read_count')
      .eq('id', id)
      .single();

    if (fetchError || !notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const readBy = notification.read_by || [];
    const alreadyRead = readBy.some((r: any) => r.student_id === studentId);

    if (!alreadyRead) {
      const updatedReadBy = [...readBy, { student_id: studentId, read_at: new Date().toISOString() }];
      await supabaseAdmin
        .from('notifications')
        .update({
          read_by: updatedReadBy,
          read_count: (notification.read_count || 0) + 1
        })
        .eq('id', id);
    }

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
};

// Mark all as read
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

    // Get all unread notifications for this student
    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('id, read_by, read_count')
      .eq('type', 'notification')
      .or('target_audience.eq.all,target_audience.eq.students');

    if (!notifications) return res.json({ success: true });

    for (const n of notifications) {
      const readBy = n.read_by || [];
      if (!readBy.some((r: any) => r.student_id === studentId)) {
        const updatedReadBy = [...readBy, { student_id: studentId, read_at: new Date().toISOString() }];
        await supabaseAdmin
          .from('notifications')
          .update({
            read_by: updatedReadBy,
            read_count: (n.read_count || 0) + 1
          })
          .eq('id', n.id);
      }
    }

    res.json({ success: true, message: 'All marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
};

// Get unread count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('read_by')
      .eq('type', 'notification')
      .or('target_audience.eq.all,target_audience.eq.students');

    const unreadCount = notifications?.filter(n => {
      const readBy = n.read_by || [];
      return !readBy.some((r: any) => r.student_id === studentId);
    }).length || 0;

    res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
};

// Submit complaint
export const submitComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { title, description, category, priority } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ success: false, error: 'Title, description, and category are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        student_id: studentId,
        title,
        message: description,
        type: 'complaint',
        category,
        priority_level: priority || 'medium',
        complaint_status: 'open'
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit complaint' });
  }
};

// Get my complaints
export const getMyComplaints = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('student_id', studentId)
      .eq('type', 'complaint')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Get my complaints error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
  }
};

// Get complaint by ID
export const getComplaintById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('student_id', studentId)
      .eq('type', 'complaint')
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch complaint' });
  }
};

// Submit feedback
export const submitFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { type, rating, subject, message } = req.body;

    if (!type || !rating) {
      return res.status(400).json({ success: false, error: 'Type and rating are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        student_id: studentId,
        title: subject || 'Feedback',
        message: message || '',
        type: 'feedback',
        category: type,
        rating: rating
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit feedback' });
  }
};

// Get my feedback history
export const getMyFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('id, category, rating, title, created_at')
      .eq('student_id', studentId)
      .eq('type', 'feedback')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Get my feedback error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
  }
};

export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  submitComplaint,
  getMyComplaints,
  getComplaintById,
  submitFeedback,
  getMyFeedback,
};
