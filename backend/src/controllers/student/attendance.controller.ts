import { Response } from 'express';
import { AuthRequest } from '../../types';
import supabaseAdmin from '../../db/supabaseAdmin';

export const getMyAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student_id = req.user?.id;
    const { course_id } = req.query;

    let query = supabaseAdmin.from('attendance').select('*').eq('student_id', student_id);
    if (course_id) query = query.eq('course_id', course_id);

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
