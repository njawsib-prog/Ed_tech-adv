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

/**
 * Get students filtered by course and branch for attendance marking
 * This endpoint returns active students that match the specified filters
 */
export const getStudentsForAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { course_id, branch_id, date } = req.query;

    // Build the query for active students
    let query = supabaseAdmin
      .from('students')
      .select('id, name, email, roll_number, course_id, branch_id, courses(name), branches(name)')
      .eq('is_active', true);

    // Apply filters
    if (course_id) {
      query = query.eq('course_id', course_id);
    }

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    // Order by name for consistent display
    const { data: students, error: studentsError } = await query.order('name', { ascending: true });

    if (studentsError) {
      res.status(400).json({ error: studentsError.message });
      return;
    }

    // If date is provided, check existing attendance records for that date
    let attendanceMap: Map<string, any> = new Map();
    if (date) {
      let attendanceQuery = supabaseAdmin
        .from('attendance')
        .select('id, student_id, status, notes, recorded_by, created_at')
        .eq('date', date);

      if (course_id) {
        attendanceQuery = attendanceQuery.eq('course_id', course_id);
      }

      if (branch_id) {
        attendanceQuery = attendanceQuery.eq('branch_id', branch_id);
      }

      const { data: existingAttendance } = await attendanceQuery;
      
      // Create a map of student_id to attendance record
      existingAttendance?.forEach(record => {
        attendanceMap.set(record.student_id, record);
      });
    }

    // Enrich student data with attendance status if date provided
    const enrichedStudents = (students || []).map(student => {
      const attendanceRecord = attendanceMap.get(student.id);
      return {
        ...student,
        attendance_status: attendanceRecord ? attendanceRecord.status : null,
        attendance_id: attendanceRecord ? attendanceRecord.id : null,
        attendance_notes: attendanceRecord ? attendanceRecord.notes : null,
        attendance_recorded_by: attendanceRecord ? attendanceRecord.recorded_by : null,
        attendance_recorded_at: attendanceRecord ? attendanceRecord.created_at : null,
      };
    });

    res.json({ 
      data: enrichedStudents,
      meta: {
        total: enrichedStudents.length,
        course_id: course_id || null,
        branch_id: branch_id || null,
        date: date || null,
        already_marked: enrichedStudents.filter((s: any) => s.attendance_status !== null).length,
      }
    });
  } catch (error: any) {
    console.error('Get students for attendance error:', error);
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
