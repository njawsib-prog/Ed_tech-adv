import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

export const getAllFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      branch_id,
      category,
      rating
    } = req.query;

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
      .eq('type', 'feedback');

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (rating) {
      query = query.eq('rating', parseInt(rating as string));
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
      console.error('Error fetching feedback:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
      return;
    }

    let filteredData = data || [];
    if (branch_id) {
      filteredData = filteredData.filter(f => (f as any).users?.branch_id === branch_id);
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
    console.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
  }
};

export const getFeedbackAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: feedback } = await supabaseAdmin
      .from('notifications')
      .select('category, rating, created_at')
      .eq('type', 'feedback');

    const total = feedback?.length || 0;

    // Rating distribution
    const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
      const count = feedback?.filter(f => f.rating === rating).length || 0;
      const percentage = total > 0 ? (count / total) * 100 : 0;
      return { rating, count, percentage: Math.round(percentage * 100) / 100 };
    });

    const averageRating = total > 0 && feedback
      ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / total
      : 0;

    res.json({
      success: true,
      data: {
        total,
        ratingDistribution,
        averageRating: Math.round(averageRating * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching feedback analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feedback analytics' });
  }
};

export const getFeedbackByBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { branch_id } = req.params;

    // We fetch all feedback and filter by student's branch_id
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select(`
        *,
        users!notifications_student_id_fkey (
          id,
          name,
          email,
          branch_id
        )
      `)
      .eq('type', 'feedback');

    if (error) {
      console.error('Error fetching branch feedback:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch branch feedback' });
      return;
    }

    const filteredFeedback = data?.filter(f => (f as any).users?.branch_id === branch_id) || [];
    const total = filteredFeedback.length;
    const averageRating = total > 0
      ? filteredFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / total
      : 0;

    res.json({
      success: true,
      data: {
        feedback: filteredFeedback,
        stats: {
          total,
          averageRating: Math.round(averageRating * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('Error fetching branch feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch branch feedback' });
  }
};
