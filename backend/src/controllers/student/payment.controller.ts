import { Response } from 'express';
import { AuthRequest } from '../../types';
import supabaseAdmin from '../../db/supabaseAdmin';

export const getMyPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student_id = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('student_id', student_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
