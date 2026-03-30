import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';
import bcrypt from 'bcryptjs';

export const getAllStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      branch_id,
      status,
      course_id
    } = req.query;

    let query = supabaseAdmin
      .from('users')
      .select(`
        *,
        branches (
          id,
          name
        ),
        courses (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('role', 'student');

    // Apply filters
    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (course_id) {
      query = query.eq('course_id', course_id);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,roll_number.ilike.%${search}%`);
    }

    const from = ((parseInt(page as string) - 1) * parseInt(limit as string));
    const to = from + parseInt(limit as string) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching students:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch students' });
      return;
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch students' });
  }
};

export const getStudentProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: student, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        branches (
          id,
          name,
          location,
          contact_number
        ),
        courses (
          id,
          name,
          category,
          price
        )
      `)
      .eq('id', id)
      .eq('role', 'student')
      .single();

    if (error || !student) {
      res.status(404).json({ success: false, error: 'Student not found' });
      return;
    }

    // Get enrollment history
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select(`
        *,
        courses (
          id,
          name
        )
      `)
      .eq('student_id', id)
      .order('enrolled_at', { ascending: false });

    res.json({
      success: true,
      data: {
        ...student,
        enrollments: enrollments || []
      }
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch student profile' });
  }
};

export const getStudentPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        branches (
          id,
          name
        )
      `)
      .eq('student_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching student payments:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch student payments' });
      return;
    }

    const totalPaid = payments?.reduce((sum, p) => {
      return p.status === 'completed' ? sum + (p.amount || 0) : sum;
    }, 0) || 0;

    const pendingAmount = payments?.reduce((sum, p) => {
      return p.status === 'pending' ? sum + (p.amount || 0) : sum;
    }, 0) || 0;

    res.json({
      success: true,
      data: {
        payments: payments || [],
        totalPaid,
        pendingAmount
      }
    });
  } catch (error) {
    console.error('Error fetching student payments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch student payments' });
  }
};

export const getStudentAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    let query = supabaseAdmin
      .from('attendance')
      .select(`
        *,
        courses (
          id,
          name
        )
      `)
      .eq('student_id', id)
      .order('date', { ascending: false });

    if (start_date) {
      query = query.gte('date', start_date);
    }

    if (end_date) {
      query = query.lte('date', end_date);
    }

    const { data: attendance, error } = await query;

    if (error) {
      console.error('Error fetching student attendance:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch student attendance' });
      return;
    }

    // Calculate attendance stats
    const total = attendance?.length || 0;
    const present = attendance?.filter(a => a.status === 'present').length || 0;
    const absent = attendance?.filter(a => a.status === 'absent').length || 0;
    const late = attendance?.filter(a => a.status === 'late').length || 0;
    const attendanceRate = total > 0 ? (present / total) * 100 : 0;

    res.json({
      success: true,
      data: {
        attendance: attendance || [],
        stats: {
          total,
          present,
          absent,
          late,
          attendanceRate: Math.round(attendanceRate * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch student attendance' });
  }
};

export const updateStudentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, is_active } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (typeof is_active === 'boolean') updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('role', 'student')
      .select()
      .single();

    if (error) {
      console.error('Error updating student status:', error);
      res.status(500).json({ success: false, error: 'Failed to update student status' });
      return;
    }

    res.json({
      success: true,
      data,
      message: 'Student status updated successfully'
    });
  } catch (error) {
    console.error('Error updating student status:', error);
    res.status(500).json({ success: false, error: 'Failed to update student status' });
  }
};

export const createStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      password,
      roll_number,
      phone,
      branch_id,
      course_id
    } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: 'Name, email, and password are required' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { data: student, error } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email,
        password_hash,
        roll_number,
        phone,
        branch_id,
        course_id,
        role: 'student',
        status: 'ACTIVE',
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating student:', error);
      res.status(500).json({ success: false, error: 'Failed to create student' });
      return;
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ success: false, error: 'Failed to create student' });
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id)
      .eq('role', 'student');

    if (error) {
      console.error('Error deleting student:', error);
      res.status(500).json({ success: false, error: 'Failed to delete student' });
      return;
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ success: false, error: 'Failed to delete student' });
  }
};
