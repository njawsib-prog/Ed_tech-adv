import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { parseCSV, validateCSVStructure } from '../../utils/csvParser';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';

interface TestRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Parse raw text extracted from PDF/DOCX to extract MCQ questions.
 * Supports common patterns like:
 *   Q1. Question text?
 *   a) Option A   b) Option B   c) Option C   d) Option D
 *   Answer: a
 *
 *   Or numbered:
 *   1. Question text?
 *   A. Opt   B. Opt   C. Opt   D. Opt
 *   Correct: B
 */
function parseQuestionsFromText(text: string): Array<{
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
}> {
  const questions: Array<{
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
  }> = [];

  // Normalize newlines and trim
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  let i = 0;
  while (i < lines.length) {
    // Look for a question line (starts with Q1., 1., Q1:, #1, etc.)
    const qMatch = lines[i].match(/^(?:Q\.?\s*)?(\d+)[.):\s]+(.+)$/i);
    if (!qMatch) { i++; continue; }

    const questionText = qMatch[2].trim();
    const opts: Record<string, string> = {};
    let answerLine = '';
    let j = i + 1;

    // Collect option lines
    while (j < lines.length && j < i + 10) {
      const line = lines[j];
      // Option pattern: a) ..., a. ..., A) ..., (a) ...
      const optMatch = line.match(/^[(\s]*([abcdABCD])[).\s]+(.+)$/);
      if (optMatch) {
        opts[optMatch[1].toLowerCase()] = optMatch[2].trim();
        j++;
        continue;
      }
      // Answer line: Answer: a, Correct: a, Ans: A, etc.
      const ansMatch = line.match(/^(?:answer|correct|ans)[:\s]+([abcdABCD])/i);
      if (ansMatch) {
        answerLine = ansMatch[1].toLowerCase();
        j++;
        break;
      }
      // If we hit another question or unrelated line, stop
      if (line.match(/^(?:Q\.?\s*)?\d+[.):\s]+/i)) break;
      j++;
    }

    // We need at least a, b, c, d and a correct answer
    if (opts.a && opts.b && opts.c && opts.d && answerLine) {
      questions.push({
        question_text: questionText,
        option_a: opts.a,
        option_b: opts.b,
        option_c: opts.c,
        option_d: opts.d,
        correct_option: answerLine,
      });
    }

    i = j;
  }

  return questions;
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

    const mimeType = file.mimetype;
    const originalName = file.originalname.toLowerCase();

    let parsedQuestions: Array<{
      question_text: string;
      option_a: string;
      option_b: string;
      option_c: string;
      option_d: string;
      correct_option: string;
    }> = [];

    const errors: { row: number; error: string; data?: unknown }[] = [];

    // ── CSV ─────────────────────────────────────────────────────────────────
    if (mimeType === 'text/csv' || originalName.endsWith('.csv')) {
      const csvContent = file.buffer.toString('utf-8');
      const rows = parseCSV(csvContent);

      const validation = validateCSVStructure(rows, 6);
      if (!validation.isValid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const validOptions = ['a', 'b', 'c', 'd'];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || row.every((f) => !f.trim())) continue;

        if (row.length < 6) {
          errors.push({ row: i + 1, error: `Expected 6 columns, found ${row.length}`, data: row });
          continue;
        }

        const [question_text, option_a, option_b, option_c, option_d, correct_option] = row;

        if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_option) {
          errors.push({ row: i + 1, error: 'Missing required fields', data: row });
          continue;
        }

        const normalizedAnswer = correct_option.toLowerCase().trim();
        if (!validOptions.includes(normalizedAnswer)) {
          errors.push({ row: i + 1, error: `Invalid correct_option "${correct_option}". Must be a, b, c, or d`, data: row });
          continue;
        }

        parsedQuestions.push({
          question_text: question_text.trim(),
          option_a: option_a.trim(),
          option_b: option_b.trim(),
          option_c: option_c.trim(),
          option_d: option_d.trim(),
          correct_option: normalizedAnswer,
        });
      }
    }
    // ── PDF ─────────────────────────────────────────────────────────────────
    else if (mimeType === 'application/pdf' || originalName.endsWith('.pdf')) {
      try {
        const pdfData = await pdfParse(file.buffer);
        parsedQuestions = parseQuestionsFromText(pdfData.text);
        if (parsedQuestions.length === 0) {
          res.status(400).json({
            error: 'No questions could be extracted from the PDF. Please ensure questions follow the expected format: numbered questions with A/B/C/D options and an "Answer: X" line.',
          });
          return;
        }
      } catch (pdfErr: unknown) {
        const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
        res.status(400).json({ error: `Failed to parse PDF: ${msg}` });
        return;
      }
    }
    // ── DOCX ────────────────────────────────────────────────────────────────
    else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      originalName.endsWith('.docx')
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        parsedQuestions = parseQuestionsFromText(result.value);
        if (parsedQuestions.length === 0) {
          res.status(400).json({
            error: 'No questions could be extracted from the DOCX. Please ensure questions follow the expected format: numbered questions with A/B/C/D options and an "Answer: X" line.',
          });
          return;
        }
      } catch (docxErr: unknown) {
        const msg = docxErr instanceof Error ? docxErr.message : String(docxErr);
        res.status(400).json({ error: `Failed to parse DOCX: ${msg}` });
        return;
      }
    } else {
      res.status(400).json({
        error: 'Unsupported file type. Please upload a CSV, PDF, or DOCX file.',
      });
      return;
    }

    // ── Insert to database ────────────────────────────────────────────────
    if (parsedQuestions.length === 0) {
      res.status(400).json({
        error: errors.length > 0 ? 'All rows had errors, nothing to insert.' : 'No valid questions found in the file.',
        errors,
      });
      return;
    }

    const dbRecords = parsedQuestions.map((q, idx) => ({
      test_id: id,
      ...q,
      order_index: idx,
      source_file: file.originalname,
    }));

    const { data, error } = await supabaseAdmin
      .from('questions')
      .insert(dbRecords)
      .select('id, question_text, order_index');

    if (error) {
      res.status(400).json({ error: `Database error: ${error.message}` });
      return;
    }

    res.json({
      success: data?.length ?? 0,
      attempted: parsedQuestions.length,
      errors,
      message: `Successfully uploaded ${data?.length ?? 0} questions${errors.length ? ` (${errors.length} rows skipped)` : ''}.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Bulk upload questions error:', error);
    res.status(500).json({ error: `Internal server error: ${msg}` });
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
          .from('users')
          .select('id')
          .eq('course_id', test.course_id)
          .eq('role', 'student')
          .eq('is_active', true);

        targetStudentIds = students?.map((s) => s.id) || [];
      }
    }

    if (targetStudentIds.length === 0) {
      res.status(400).json({ error: 'No students to assign' });
      return;
    }

    // Create assignments in results table
    const assignments = targetStudentIds.map((studentId: string) => ({
      test_id: id,
      student_id: studentId,
      assignment_status: 'pending',
    }));

    const { error } = await supabaseAdmin
      .from('results')
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