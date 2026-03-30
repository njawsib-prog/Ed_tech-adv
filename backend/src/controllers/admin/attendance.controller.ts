import { Response } from 'express';
import { AuthRequest } from '../../types';
import supabaseAdmin from '../../db/supabaseAdmin';

export const getAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, student_id, branch_id, course_id } = req.query;
    
    let query = supabaseAdmin.from('attendance').select('*, students:users!attendance_student_id_fkey(name)');

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

/**
 * Get students filtered by course and branch for attendance marking
 */
export const getStudentsForAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { course_id, branch_id, date } = req.query;

    let query = supabaseAdmin
      .from('users')
      .select('id, name, email, roll_number, course_id, branch_id, courses(name), branches(name)')
      .eq('role', 'student')
      .eq('status', 'ACTIVE');

    if (course_id) query = query.eq('course_id', course_id);
    if (branch_id) query = query.eq('branch_id', branch_id);

    const { data: students, error: studentsError } = await query.order('name', { ascending: true });

    if (studentsError) {
      res.status(400).json({ error: studentsError.message });
      return;
    }

    // If date is provided, check existing attendance records
    let attendanceMap: Map<string, any> = new Map();
    if (date) {
      let attendanceQuery = supabaseAdmin
        .from('attendance')
        .select('id, student_id, status, notes, recorded_by, created_at')
        .eq('date', date);

      const { data: existingAttendance } = await attendanceQuery;
      existingAttendance?.forEach(record => {
        attendanceMap.set(record.student_id, record);
      });
    }

    const enrichedStudents = (students || []).map(student => {
      const attendanceRecord = attendanceMap.get(student.id);
      return {
        ...student,
        attendance_status: attendanceRecord ? attendanceRecord.status : null,
        attendance_id: attendanceRecord ? attendanceRecord.id : null,
      };
    });

    res.json({ data: enrichedStudents });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const markAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { records } = req.body;
    const admin_id = req.user?.id;

    const formattedRecords = records.map((record: any) => ({
      ...record,
      recorded_by: admin_id,
    }));

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .upsert(formattedRecords, { onConflict: 'student_id,course_id,date' })
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
