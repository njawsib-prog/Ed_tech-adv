import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { parseCSV, validateCSVStructure } from '../../utils/csvParser';

interface TestRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Get all tests
export const getTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { course_id, type } = req.query;

    let query = supabaseAdmin
      .from('tests')
      .select(`
        *,
        courses (name),
        questions (count)
      `)
      .order('created_at', { ascending: false });

    if (course_id) {
      query = query.eq('course_id', course_id);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Get submission counts
    const testsWithCounts = await Promise.all(
      (data || []).map(async (test) => {
        const { count: submissionCount } = await supabaseAdmin
          .from('results')
          .select('*', { count: 'exact', head: true })
          .eq('test_id', test.id);

        return {
          ...test,
          question_count: test.questions?.[0]?.count || 0,
          submission_count: submissionCount || 0,
        };
      })
    );

    res.json(testsWithCounts);
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new test
export const createTest = async (req: TestRequest, res: Response): Promise<void> => {
  try {
    const { title, description, course_id, time_limit_mins, type, scheduled_at } = req.body;

    if (!title || !course_id) {
      res.status(400).json({ error: 'Title and course are required' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('tests')
      .insert({
        title,
        description,
        course_id,
        time_limit_mins: time_limit_mins || 60,
        type: type || 'graded',
        scheduled_at,
        is_active: !scheduled_at,
        created_by: req.user?.id,
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // TODO: If scheduled_at is set, create BullMQ job for scheduling

    res.status(201).json(data);
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a test
export const updateTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, time_limit_mins, type, scheduled_at, is_active } = req.body;

    // Check if test has submissions
    const { count } = await supabaseAdmin
      .from('results')
      .select('*', { count: 'exact', head: true })
      .eq('test_id', id);

    if (count && count > 0) {
      res.status(400).json({ error: 'Cannot edit test with existing submissions' });
      return;
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (time_limit_mins) updateData.time_limit_mins = time_limit_mins;
    if (type) updateData.type = type;
    if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('tests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a test (soft delete)
export const deleteTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('tests')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Test deactivated successfully' });
  } catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get questions for a test
export const getTestQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('test_id', id)
      .order('order_index');

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a question
export const addQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { question_text, option_a, option_b, option_c, option_d, correct_option, order_index } = req.body;

    if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_option) {
      res.status(400).json({ error: 'All question fields are required' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('questions')
      .insert({
        test_id: id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        order_index: order_index || 0,
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a question
export const updateQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { question_text, option_a, option_b, option_c, option_d, correct_option, order_index } = req.body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (question_text) updateData.question_text = question_text;
    if (option_a) updateData.option_a = option_a;
    if (option_b) updateData.option_b = option_b;
    if (option_c) updateData.option_c = option_c;
    if (option_d) updateData.option_d = option_d;
    if (correct_option) updateData.correct_option = correct_option;
    if (order_index !== undefined) updateData.order_index = order_index;

    const { data, error } = await supabaseAdmin
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a question
export const deleteQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk upload questions via CSV
export const bulkUploadQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const csvContent = file.buffer.toString('utf-8');
    const rows = parseCSV(csvContent);

    // Validate CSV structure - expecting 6 columns: question_text, option_a, option_b, option_c, option_d, correct_option
    const validation = validateCSVStructure(rows, 6);
    if (!validation.isValid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const questions: any[] = [];
    const errors: { row: number; error: string; data?: any }[] = [];
    const validOptions = ['a', 'b', 'c', 'd'];

    // Process data rows (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // Skip empty rows
      if (row.length === 0 || row.every(field => !field.trim())) {
        continue;
      }

      if (row.length < 6) {
        errors.push({ 
          row: i + 1, 
          error: `Missing fields. Expected 6 columns, found ${row.length}`,
          data: row 
        });
        continue;
      }

      const [question_text, option_a, option_b, option_c, option_d, correct_option] = row;

      // Validate required fields
      if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_option) {
        errors.push({ 
          row: i + 1, 
          error: 'Missing required fields (question_text, option_a, option_b, option_c, option_d, correct_option)',
          data: row 
        });
        continue;
      }

      // Validate correct_option
      const normalizedCorrectOption = correct_option.toLowerCase().trim();
      if (!validOptions.includes(normalizedCorrectOption)) {
        errors.push({ 
          row: i + 1, 
          error: `Invalid correct_option "${correct_option}". Must be one of: a, b, c, d`,
          data: row 
        });
        continue;
      }

      questions.push({
        test_id: id,
        question_text: question_text.trim(),
        option_a: option_a.trim(),
        option_b: option_b.trim(),
        option_c: option_c.trim(),
        option_d: option_d.trim(),
        correct_option: normalizedCorrectOption,
        order_index: questions.length, // Sequential order index
      });
    }

    // Insert questions to database
    if (questions.length > 0) {
      try {
        const { data, error } = await supabaseAdmin
          .from('questions')
          .insert(questions)
          .select('id, question_text, order_index');

        if (error) {
          console.error('[BulkUploadQuestions] Database error:', error);
          res.status(400).json({ 
            error: `Database error: ${error.message}`,
            successful: 0,
            attempted: questions.length 
          });
          return;
        }

        res.json({
          success: data?.length || 0,
          attempted: questions.length,
          errors,
          message: `Successfully uploaded ${data?.length || 0} questions. ${errors.length} rows had errors.`
        });
      } catch (dbError: any) {
        console.error('[BulkUploadQuestions] Database exception:', dbError);
        res.status(500).json({ 
          error: `Database error: ${dbError.message}`,
          successful: 0,
          attempted: questions.length 
        });
        return;
      }
    } else if (errors.length > 0) {
      res.status(400).json({
        success: 0,
        attempted: 0,
        errors,
        message: 'No valid questions found in the CSV file. Please check the format and data.'
      });
    } else {
      res.status(400).json({
        error: 'No data rows found in the CSV file'
      });
    }
  } catch (error: any) {
    console.error('Bulk upload questions error:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

// Assign test to students
export const assignTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { student_ids, assign_all_course } = req.body;

    let targetStudentIds = student_ids || [];

    // If assign_all_course is true, get all students in the test's course
    if (assign_all_course) {
      const { data: test } = await supabaseAdmin
        .from('tests')
        .select('course_id')
        .eq('id', id)
        .single();

      if (test?.course_id) {
        const { data: students } = await supabaseAdmin
          .from('students')
          .select('id')
          .eq('course_id', test.course_id)
          .eq('is_active', true);

        targetStudentIds = students?.map((s) => s.id) || [];
      }
    }

    if (targetStudentIds.length === 0) {
      res.status(400).json({ error: 'No students to assign' });
      return;
    }

    // Create assignments
    const assignments = targetStudentIds.map((studentId: string) => ({
      test_id: id,
      student_id: studentId,
      status: 'pending',
    }));

    const { error } = await supabaseAdmin
      .from('test_assignments')
      .upsert(assignments, { onConflict: 'test_id,student_id' });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Test assigned successfully', assigned_count: targetStudentIds.length });
  } catch (error) {
    console.error('Assign test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getTests,
  createTest,
  updateTest,
  deleteTest,
  getTestQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  bulkUploadQuestions,
  assignTest,
};