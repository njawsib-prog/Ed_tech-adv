import { Response } from 'express';
import { AuthRequest } from '../../types';
import { supabaseAdmin } from '../../db/supabaseAdmin';

export const getStreakInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student_id = req.user?.id;

    const { data: student, error } = await supabaseAdmin
      .from('users')
      .select('current_streak, max_streak, last_activity_date')
      .eq('id', student_id)
      .single();

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, data: student });
  } catch (error: any) {
    console.error('Get streak info error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateStreak = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student_id = req.user?.id;
    const today = new Date().toISOString().split('T')[0];

    const { data: student, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('current_streak, max_streak, last_activity_date')
      .eq('id', student_id)
      .single();

    if (fetchError) {
      res.status(400).json({ success: false, error: fetchError.message });
      return;
    }

    let { current_streak = 0, max_streak = 0, last_activity_date } = student;
    
    if (last_activity_date === today) {
      res.json({ success: true, data: student });
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (last_activity_date === yesterdayStr) {
      current_streak += 1;
    } else {
      current_streak = 1;
    }

    if (current_streak > max_streak) {
      max_streak = current_streak;
    }

    const { data, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        current_streak,
        max_streak,
        last_activity_date: today,
        updated_at: new Date().toISOString()
      })
      .eq('id', student_id)
      .select()
      .single();

    if (updateError) {
      res.status(400).json({ success: false, error: updateError.message });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Update streak error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export default {
  getStreakInfo,
  updateStreak,
};
