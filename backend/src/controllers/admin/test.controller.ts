import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

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
      res.status(400).json({ success: false, error: error.message });
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

    res.json({ success: true, data: testsWithCounts || [] });
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Create a new test
export const createTest = async (req: TestRequest, res: Response): Promise<void> => {
  try {
    const { title, description, course_id, time_limit_mins, type, scheduled_at } = req.body;

    if (!title || !course_id) {
      res.status(400).json({ success: false, error: 'Title and course are required' });
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
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    // TODO: If scheduled_at is set, create BullMQ job for scheduling

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
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
    const rows = csvContent.split('\n').filter((row) => row.trim());

    const questions: any[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const fields = row.split(',').map((f) => f.trim().replace(/^"|"$/g, ''));

      if (fields.length < 6) {
        errors.push({ row: i + 1, error: 'Missing fields' });
        continue;
      }

      const [question_text, option_a, option_b, option_c, option_d, correct_option] = fields;

      if (!['a', 'b', 'c', 'd'].includes(correct_option.toLowerCase())) {
        errors.push({ row: i + 1, error: 'Invalid correct_option (must be a, b, c, or d)' });
        continue;
      }

      questions.push({
        test_id: id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option: correct_option.toLowerCase(),
        order_index: i - 1,
      });
    }

    if (questions.length > 0) {
      const { error } = await supabaseAdmin
        .from('questions')
        .insert(questions);

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
    }

    res.json({
      success: questions.length,
      errors,
    });
  } catch (error) {
    console.error('Bulk upload questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
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