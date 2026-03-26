import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import csv from 'csv-parser';
import { Readable } from 'stream';

interface StudentRequest extends Request {
  body: {
    name: string;
    email: string;
    password: string;
    course_id: string;
  };
  user?: {
    id: string;
    role: string;
  };
}

// Get all students with filtering and pagination
export const getStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, course_id, status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('students')
      .select('id, name, email, course_id, is_active, created_at, last_login, courses(name)', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (course_id) {
      query = query.eq('course_id', course_id);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({
      students: data,
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new student
export const createStudent = async (req: StudentRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, course_id } = req.body;

    if (!name || !email || !password || !course_id) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const { data, error } = await supabaseAdmin
      .from('students')
      .insert({
        name,
        email,
        password_hash: passwordHash,
        course_id,
        is_active: true,
      })
      .select('id, name, email, course_id, is_active, created_at')
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk upload students via CSV
export const bulkUploadStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const results: { success: any[]; errors: { row: number; error: string }[] } = {
      success: [],
      errors: [],
    };

    const csvContent = file.buffer.toString('utf-8');
    const rows = csvContent.split('\n').filter((row) => row.trim());

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const [name, email, password, course_id] = row.split(',').map((field) => field.trim().replace(/^"|"$/g, ''));

      if (!name || !email || !password || !course_id) {
        results.errors.push({ row: i + 1, error: 'Missing required fields' });
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(password, 12);

        const { data, error } = await supabaseAdmin
          .from('students')
          .upsert(
            {
              name,
              email,
              password_hash: passwordHash,
              course_id,
              is_active: true,
            },
            { onConflict: 'email' }
          )
          .select('id, name, email')
          .single();

        if (error) {
          results.errors.push({ row: i + 1, error: error.message });
        } else {
          results.success.push(data);
        }
      } catch (err: any) {
        results.errors.push({ row: i + 1, error: err.message || 'Unknown error' });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a student
export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, course_id, is_active } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (course_id) updateData.course_id = course_id;
    if (typeof is_active === 'boolean') updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, course_id, is_active')
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a student (soft delete)
export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Soft delete - set is_active to false
    const { error } = await supabaseAdmin
      .from('students')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Student deactivated successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getStudents,
  createStudent,
  bulkUploadStudents,
  updateStudent,
  deleteStudent,
};