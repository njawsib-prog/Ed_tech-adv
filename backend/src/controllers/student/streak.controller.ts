import { Response } from 'express';
import { AuthRequest } from '../../types';
import supabaseAdmin from '../../db/supabaseAdmin';

export const getStreakInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student_id = req.user?.id;

    const { data: student, error } = await supabaseAdmin
      .from('students')
      .select('current_streak, max_streak, last_activity_date')
      .eq('id', student_id)
      .single();

    if (error) throw error;

    res.json({ data: student });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateStreak = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student_id = req.user?.id;
    const today = new Date().toISOString().split('T')[0];

    const { data: student, error: fetchError } = await supabaseAdmin
      .from('students')
      .select('current_streak, max_streak, last_activity_date')
      .eq('id', student_id)
      .single();

    if (fetchError) throw fetchError;

    let { current_streak, max_streak, last_activity_date } = student;
    
    if (last_activity_date === today) {
      // Already updated today
      res.json({ data: student });
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
      .from('students')
      .update({
        current_streak,
        max_streak,
        last_activity_date: today,
      })
      .eq('id', student_id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
