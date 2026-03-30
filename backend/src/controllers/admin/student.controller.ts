import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { parseCSV, validateCSVStructure } from '../../utils/csvParser';

interface StudentRequest extends Request {
  body: {
    name: string;
    email: string;
    password: string;
    course_id: string;
    branch_id?: string;
  };
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Get all students with filtering and pagination
export const getStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, course_id, branch_id, status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Use users table directly
    let query = supabaseAdmin
      .from('users')
      .select('id, name, email, course_id, branch_id, status, is_active, created_at, last_login, roll_number, courses(name), branches(name)', { count: 'exact' })
      .eq('role', 'student');

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (course_id) {
      query = query.eq('course_id', course_id);
    }

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    if (status) {
      query = query.eq('status', (status as string).toUpperCase());
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      data: {
        students: data || [],
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Create a new student
export const createStudent = async (req: StudentRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, course_id, branch_id } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: 'Name, email and password are required' });
      return;
    }

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      res.status(400).json({ success: false, error: 'Email already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email,
        password_hash: passwordHash,
        course_id,
        branch_id,
        role: 'student',
        is_active: true,
        status: 'ACTIVE',
      })
      .select('id, name, email, course_id, branch_id, status, is_active, created_at')
      .single();

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Bulk upload students via CSV
export const bulkUploadStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const csvContent = file.buffer.toString('utf-8');
    const rows = parseCSV(csvContent);

    // Process data rows (skip header)
    const validStudents = [];
    for (let i = 1; i < rows.length; i++) {
      const [name, email, password, course_id, branch_id] = rows[i];
      if (name && email && password) {
        const passwordHash = await bcrypt.hash(password, 12);
        validStudents.push({
          name,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          role: 'student',
          course_id,
          branch_id,
          status: 'ACTIVE',
          is_active: true
        });
      }
    }

    if (validStudents.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .upsert(validStudents, { onConflict: 'email' })
        .select('id, name, email');

      if (error) {
        res.status(400).json({ success: false, error: error.message });
        return;
      }

      res.json({ success: true, message: `Successfully uploaded ${data?.length} students` });
    } else {
      res.status(400).json({ success: false, error: 'No valid student data found in CSV' });
    }
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ success: false, error: `Internal server error: ${error.message}` });
  }
};

// Update a student
export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.password) {
      updates.password_hash = await bcrypt.hash(updates.password, 12);
      delete updates.password;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('role', 'student')
      .select()
      .single();

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get a single student by ID
export const getStudentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, course_id, branch_id, status, is_active, created_at, last_login, roll_number, courses(id, name), branches(id, name)')
      .eq('id', id)
      .eq('role', 'student')
      .single();

    if (error || !data) {
      res.status(404).json({ success: false, error: 'Student not found' });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get student by ID error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Delete a student (soft delete)
export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('users')
      .update({ status: 'INACTIVE', is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('role', 'student');

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, message: 'Student deactivated successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export default {
  getStudents,
  getStudentById,
  createStudent,
  bulkUploadStudents,
  updateStudent,
  deleteStudent,
};
