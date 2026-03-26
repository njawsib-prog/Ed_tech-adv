import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    instituteId: string;
  };
}

// Get all notifications
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
    const { page = 1, limit = 20, type, targetAudience } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('institute_id', instituteId);

    if (type) {
      query = query.eq('type', type);
    }
    if (targetAudience) {
      query = query.eq('target_audience', targetAudience);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      notifications: data,
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

// Create notification
export const createNotification = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
    const adminId = req.user?.id;
    const { title, message, type, targetAudience, actionUrl, scheduledAt } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        institute_id: instituteId,
        title,
        message,
        type: type || 'info',
        target_audience: targetAudience || 'all',
        action_url: actionUrl,
        scheduled_at: scheduledAt,
        created_by: adminId
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
};

// Update notification
export const updateNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;
    const { title, message, type, targetAudience, actionUrl, scheduledAt } = req.body;

    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (message !== undefined) updateData.message = message;
    if (type !== undefined) updateData.type = type;
    if (targetAudience !== undefined) updateData.target_audience = targetAudience;
    if (actionUrl !== undefined) updateData.action_url = actionUrl;
    if (scheduledAt !== undefined) updateData.scheduled_at = scheduledAt;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update(updateData)
      .eq('id', id)
      .eq('institute_id', instituteId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

// Delete notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('institute_id', instituteId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Broadcast notification to all students
export const broadcastNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;

    // Get the notification
    const { data: notification, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('institute_id', instituteId)
      .single();

    if (fetchError || !notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Mark as sent
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // TODO: Integrate with push notification service or email

    res.json({ message: 'Notification broadcasted successfully', notification });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({ error: 'Failed to broadcast notification' });
  }
};

// Get complaints
export const getComplaints = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
    const { page = 1, limit = 20, status, category } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
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
        students (
          id,
          name,
          email,
          roll_number
        ),
        complaint_replies (
          id,
          message,
          created_at,
          admin_id
        )
      `, { count: 'exact' })
      .eq('institute_id', instituteId);

    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      complaints: data,
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
};

// Get complaint by ID
export const getComplaintById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
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
        students (
          id,
          name,
          email,
          roll_number
        ),
        complaint_replies (
          id,
          message,
          created_at,
          admin_id,
          admins (name)
        )
      `)
      .eq('id', id)
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

// Reply to complaint
export const replyToComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;
    const adminId = req.user?.id;
    const { message, updateStatus } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create reply
    const { data: reply, error: replyError } = await supabaseAdmin
      .from('complaint_replies')
      .insert({
        complaint_id: id,
        admin_id: adminId,
        message
      })
      .select()
      .single();

    if (replyError) {
      return res.status(400).json({ error: replyError.message });
    }

    // Update complaint status if provided
    if (updateStatus) {
      await supabaseAdmin
        .from('complaints')
        .update({ status: updateStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('institute_id', instituteId);
    }

    res.status(201).json(reply);
  } catch (error) {
    console.error('Reply to complaint error:', error);
    res.status(500).json({ error: 'Failed to reply to complaint' });
  }
};

// Update complaint status
export const updateComplaintStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;
    const { status, priority } = req.body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    const { data, error } = await supabaseAdmin
      .from('complaints')
      .update(updateData)
      .eq('id', id)
      .eq('institute_id', instituteId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
};

// Get feedback
export const getFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
    const { page = 1, limit = 20, type, rating } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('feedback')
      .select(`
        id,
        type,
        rating,
        subject,
        message,
        created_at,
        students (
          id,
          name,
          email,
          roll_number
        )
      `, { count: 'exact' })
      .eq('institute_id', instituteId);

    if (type) {
      query = query.eq('type', type);
    }
    if (rating) {
      query = query.eq('rating', rating);
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      feedback: data,
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};

// Get feedback statistics
export const getFeedbackStats = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;

    const { data, error } = await supabaseAdmin
      .from('feedback')
      .select('rating, type')
      .eq('institute_id', instituteId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const totalFeedback = data?.length || 0;
    const averageRating = totalFeedback > 0
      ? data!.reduce((sum, f) => sum + (f.rating || 0), 0) / totalFeedback
      : 0;

    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: data?.filter(f => f.rating === rating).length || 0
    }));

    const typeDistribution = ['course', 'test', 'platform', 'other'].reduce((acc, type) => {
      acc[type] = data?.filter(f => f.type === type).length || 0;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      totalFeedback,
      averageRating,
      ratingDistribution,
      typeDistribution
    });
  } catch (error) {
    console.error('Get feedback stats error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback statistics' });
  }
};