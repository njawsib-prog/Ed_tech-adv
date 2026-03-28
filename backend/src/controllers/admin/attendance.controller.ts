import { Response } from 'express';
import { AuthRequest } from '../../types';
import supabaseAdmin from '../../db/supabaseAdmin';

export const getAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, student_id, branch_id, course_id } = req.query;
    
    let query = supabaseAdmin.from('attendance').select('*, students(name)');

    if (date) query = query.eq('date', date);
    if (student_id) query = query.eq('student_id', student_id);
    if (branch_id) query = query.eq('branch_id', branch_id);
    if (course_id) query = query.eq('course_id', course_id);

    const { data, error } = await query.order('date', { ascending: false });

    if (error) throw error;

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const markAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { records } = req.body; // Array of { student_id, branch_id, course_id, date, status }

    const admin_id = req.user?.id;

    const formattedRecords = records.map((record: any) => ({
      ...record,
      recorded_by: admin_id,
    }));

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .insert(formattedRecords)
      .select();

    if (error) throw error;

    res.status(201).json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
