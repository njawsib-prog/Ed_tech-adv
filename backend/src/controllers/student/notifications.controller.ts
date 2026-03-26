import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    instituteId: string;
  };
}

// Get student notifications
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('institute_id', instituteId)
      .or(`target_audience.eq.all,target_audience.eq.students`)
      .not('sent_at', 'is', null);

    if (unreadOnly === 'true') {
      query = query.not('id', 'in', `(SELECT notification_id FROM notification_reads WHERE student_id = '${studentId}')`);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: notifications, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get read status
    const notificationIds = notifications?.map(n => n.id) || [];
    const { data: reads } = await supabaseAdmin
      .from('notification_reads')
      .select('notification_id')
      .eq('student_id', studentId)
      .in('notification_id', notificationIds);

    const readIds = new Set(reads?.map(r => r.notification_id) || []);

    const notificationsWithRead = notifications?.map(n => ({
      ...n,
      is_read: readIds.has(n.id)
    }));

    res.json({
      notifications: notificationsWithRead,
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    const { error } = await supabaseAdmin
      .from('notification_reads')
      .insert({
        notification_id: id,
        student_id: studentId,
        institute_id: instituteId
      });

    if (error && !error.message.includes('duplicate')) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

// Mark all as read
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    // Get all unread notifications
    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('institute_id', instituteId)
      .or(`target_audience.eq.all,target_audience.eq.students`)
      .not('sent_at', 'is', null);

    if (!notifications || notifications.length === 0) {
      return res.json({ message: 'No notifications to mark' });
    }

    const reads = notifications.map(n => ({
      notification_id: n.id,
      student_id: studentId,
      institute_id: instituteId
    }));

    const { error } = await supabaseAdmin
      .from('notification_reads')
      .upsert(reads, { onConflict: 'notification_id,student_id' });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'All marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

// Get unread count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    const { count: total } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('institute_id', instituteId)
      .or(`target_audience.eq.all,target_audience.eq.students`)
      .not('sent_at', 'is', null);

    const { count: read } = await supabaseAdmin
      .from('notification_reads')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('institute_id', instituteId);

    res.json({ unreadCount: (total || 0) - (read || 0) });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// Submit complaint
export const submitComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;
    const { title, description, category, priority } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Title, description, and category are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('complaints')
      .insert({
        institute_id: instituteId,
        student_id: studentId,
        title,
        description,
        category,
        priority: priority || 'medium',
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({ error: 'Failed to submit complaint' });
  }
};

// Get my complaints
export const getMyComplaints = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    const { data, error } = await supabaseAdmin
      .from('complaints')
      .select(`
        id,
        title,
        category,
        status,
        priority,
        created_at,
        updated_at,
        complaint_replies (
          id,
          message,
          created_at
        )
      `)
      .eq('student_id', studentId)
      .eq('institute_id', instituteId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Get my complaints error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
};

// Get complaint by ID
export const getComplaintById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    const { data, error } = await supabaseAdmin
      .from('complaints')
      .select(`
        id,
        title,
        description,
        category,
        status,
        priority,
        created_at,
        updated_at,
        complaint_replies (
          id,
          message,
          created_at
        )
      `)
      .eq('id', id)
      .eq('student_id', studentId)
      .eq('institute_id', instituteId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
};

// Submit feedback
export const submitFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;
    const { type, rating, subject, message } = req.body;

    if (!type || !rating) {
      return res.status(400).json({ error: 'Type and rating are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert({
        institute_id: instituteId,
        student_id: studentId,
        type,
        rating,
        subject,
        message
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};

// Get my feedback history
export const getMyFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    const { data, error } = await supabaseAdmin
      .from('feedback')
      .select('id, type, rating, subject, created_at')
      .eq('student_id', studentId)
      .eq('institute_id', instituteId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Get my feedback error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};