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

    let query = supabaseAdmin
      .from('students')
      .select('id, name, email, course_id, branch_id, status, is_active, created_at, last_login, courses(name), branches(name)', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (course_id) {
      query = query.eq('course_id', course_id);
    }

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    if (status === 'active' || status === 'ACTIVE') {
      query = query.eq('status', 'ACTIVE');
    } else if (status === 'inactive' || status === 'INACTIVE') {
      query = query.eq('status', 'INACTIVE');
    } else if (status === 'suspended' || status === 'SUSPENDED') {
      query = query.eq('status', 'SUSPENDED');
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
    const { name, email, password, course_id, branch_id } = req.body as any;

    if (!name || !email || !password || !course_id) {
      res.status(400).json({ success: false, error: 'All fields are required' });
      return;
    }

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from('students')
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
      .from('students')
      .insert({
        name,
        email,
        password_hash: passwordHash,
        course_id,
        branch_id,
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

    const results: { 
      success: any[]; 
      errors: { row: number; error: string; data?: any }[];
      summary: {
        totalProcessed: number;
        successful: number;
        failed: number;
        skipped: number;
      }
    } = {
      success: [],
      errors: [],
      summary: {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
      }
    };

    const csvContent = file.buffer.toString('utf-8');
    const rows = parseCSV(csvContent);

    // Validate CSV structure using utility
    const validation = validateCSVStructure(rows, 4);
    if (!validation.isValid) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    // Log header for debugging
    const headerRow = rows[0];
    console.log(`[BulkUpload] Processing CSV with headers: ${headerRow.join(', ')}`);

    // Prepare students data for batch upsert
    const validStudents: Array<{
      name: string;
      email: string;
      password_hash: string;
      course_id: string;
      is_active: boolean;
    }> = [];
    const invalidRows: Array<{ rowNumber: number; error: string; data: string[] }> = [];

    // Process data rows (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      results.summary.totalProcessed++;

      // Skip empty rows
      if (row.length === 0 || row.every(field => !field.trim())) {
        results.summary.skipped++;
        continue;
      }

      const [name, email, password, course_id] = row;

      // Validate required fields
      if (!name || !email || !password || !course_id) {
        invalidRows.push({ rowNumber: i + 1, error: 'Missing required fields (name, email, password, course_id)', data: row });
        results.summary.failed++;
        continue;
      }

      // Validate email format
      if (!isValidEmail(email)) {
        invalidRows.push({ rowNumber: i + 1, error: `Invalid email format: ${email}`, data: row });
        results.summary.failed++;
        continue;
      }

      // Validate password length
      if (password.length < 6) {
        invalidRows.push({ rowNumber: i + 1, error: 'Password must be at least 6 characters', data: row });
        results.summary.failed++;
        continue;
      }

      // Validate course_id format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(course_id)) {
        invalidRows.push({ rowNumber: i + 1, error: `Invalid course_id format: ${course_id}`, data: row });
        results.summary.failed++;
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      validStudents.push({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        course_id: course_id.trim(),
        is_active: true,
      });
    }

    // Batch upsert all valid students
    if (validStudents.length > 0) {
      // Process in batches of 100 to avoid hitting size limits
      const batchSize = 100;
      for (let i = 0; i < validStudents.length; i += batchSize) {
        const batch = validStudents.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        try {
          const { data, error } = await supabaseAdmin
            .from('students')
            .upsert(batch, { onConflict: 'email' })
            .select('id, name, email');

          if (error) {
            console.error(`[BulkUpload] Batch ${batchNumber} failed:`, error.message);
            // Mark all rows in this batch as errors
            batch.forEach((student, idx) => {
              const originalRowNumber = rows.findIndex(row => row[1] === student.email) + 1;
              invalidRows.push({
                rowNumber: originalRowNumber || i + idx + 2,
                error: `Database error: ${error.message}`,
                data: [student.name, student.email, '***', student.course_id],
              });
              results.summary.failed++;
            });
          } else {
            results.success.push(...(data || []));
            results.summary.successful += (data || []).length;
          }
        } catch (batchError: any) {
          console.error(`[BulkUpload] Batch ${batchNumber} exception:`, batchError);
          batch.forEach((student, idx) => {
            invalidRows.push({
              rowNumber: i + idx + 2,
              error: `Processing error: ${batchError.message}`,
              data: [student.name, student.email, '***', student.course_id],
            });
            results.summary.failed++;
          });
        }
      }
    }

    // Add invalid row errors to results
    invalidRows.forEach(({ rowNumber, error, data }) => {
      results.errors.push({ row: rowNumber, error, data });
    });

    console.log(`[BulkUpload] Completed: ${results.summary.successful} successful, ${results.summary.failed} errors, ${results.summary.skipped} skipped`);

    res.json({ 
      success: true, 
      data: results,
      message: `Processed ${results.summary.totalProcessed} rows: ${results.summary.successful} successful, ${results.summary.failed} failed, ${results.summary.skipped} skipped`
    });
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ success: false, error: `Internal server error: ${error.message}` });
  }
};

// Update a student
export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, course_id, branch_id, status, is_active, password } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (course_id) updateData.course_id = course_id;
    if (branch_id !== undefined) updateData.branch_id = branch_id;

    // Support new 'status' field (ACTIVE / INACTIVE / SUSPENDED)
    if (status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status as string)) {
      updateData.status = status;
      updateData.is_active = status === 'ACTIVE';
    } else if (typeof is_active === 'boolean') {
      updateData.is_active = is_active;
      updateData.status = is_active ? 'ACTIVE' : 'INACTIVE';
    }

    // Optional password reset
    if (password && typeof password === 'string' && password.trim().length >= 6) {
      updateData.password_hash = await bcrypt.hash(password.trim(), 12);
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, course_id, branch_id, status, is_active')
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
      .from('students')
      .select('id, name, email, course_id, branch_id, status, is_active, created_at, last_login, roll_number, courses(id, name), branches(id, name)')
      .eq('id', id)
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

    // Soft delete - set status to INACTIVE and is_active to false
    const { error } = await supabaseAdmin
      .from('students')
      .update({ status: 'INACTIVE', is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

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