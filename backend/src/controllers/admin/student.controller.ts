import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../db/supabaseAdmin';

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
 * Parse CSV with proper handling of quoted fields
 */
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote within quotes
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      // Row separator
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
      }
      if (currentRow.length > 0 && currentRow.some(field => field !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      // Skip \r if followed by \n
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentField += char;
    }
  }

  // Add last row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
  }
  if (currentRow.length > 0 && currentRow.some(field => field !== '')) {
    rows.push(currentRow);
  }

  return rows;
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
      .select('id, name, email, course_id, branch_id, is_active, created_at, last_login, courses(name), branches(name)', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (course_id) {
      query = query.eq('course_id', course_id);
    }

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
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
        branch_id,
        is_active: true,
      })
      .select('id, name, email, course_id, branch_id, is_active, created_at')
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

    const results: { success: any[]; errors: { row: number; error: string; data?: any }[] } = {
      success: [],
      errors: [],
    };

    const csvContent = file.buffer.toString('utf-8');
    const rows = parseCSV(csvContent);

    // Validate header row (expecting 4 columns: name, email, password, course_id)
    if (rows.length < 1) {
      res.status(400).json({ error: 'CSV file is empty' });
      return;
    }

    const headerRow = rows[0];
    if (headerRow.length < 4) {
      res.status(400).json({ error: 'Invalid CSV format. Expected: name, email, password, course_id' });
      return;
    }

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
      const [name, email, password, course_id] = row;

      // Validate required fields
      if (!name || !email || !password || !course_id) {
        invalidRows.push({ rowNumber: i + 1, error: 'Missing required fields', data: row });
        continue;
      }

      // Validate email format
      if (!isValidEmail(email)) {
        invalidRows.push({ rowNumber: i + 1, error: 'Invalid email format', data: row });
        continue;
      }

      // Validate password length
      if (password.length < 6) {
        invalidRows.push({ rowNumber: i + 1, error: 'Password must be at least 6 characters', data: row });
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      validStudents.push({
        name,
        email,
        password_hash: passwordHash,
        course_id,
        is_active: true,
      });
    }

    // Batch upsert all valid students
    if (validStudents.length > 0) {
      // Process in batches of 100 to avoid hitting size limits
      const batchSize = 100;
      for (let i = 0; i < validStudents.length; i += batchSize) {
        const batch = validStudents.slice(i, i + batchSize);

        const { data, error } = await supabaseAdmin
          .from('students')
          .upsert(batch, { onConflict: 'email' })
          .select('id, name, email');

        if (error) {
          console.error(`[BulkUpload] Batch ${i / batchSize + 1} failed:`, error.message);
          // Mark all rows in this batch as errors
          batch.forEach((_, idx) => {
            invalidRows.push({
              rowNumber: i + idx + 2, // +2 for header and 0-based index
              error: `Batch upsert failed: ${error.message}`,
              data: [],
            });
          });
        } else {
          results.success.push(...(data || []));
        }
      }
    }

    // Add invalid row errors to results
    invalidRows.forEach(({ rowNumber, error, data }) => {
      results.errors.push({ row: rowNumber, error, data });
    });

    console.log(`[BulkUpload] Completed: ${results.success.length} successful, ${results.errors.length} errors`);

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
    const { name, email, course_id, branch_id, is_active } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (course_id) updateData.course_id = course_id;
    if (branch_id) updateData.branch_id = branch_id;
    if (typeof is_active === 'boolean') updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, course_id, branch_id, is_active')
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