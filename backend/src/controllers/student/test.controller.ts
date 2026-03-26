import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface StudentRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Get all tests for student
export const getStudentTests = async (req: StudentRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get all assigned tests
    const { data: assignments, error } = await supabaseAdmin
      .from('test_assignments')
      .select(`
        id,
        status,
        start_time,
        tests (
          id,
          title,
          description,
          time_limit_mins,
          scheduled_at,
          is_active,
          type,
          courses (name)
        )
      `)
      .eq('student_id', studentId);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Get results for completed tests
    const { data: results } = await supabaseAdmin
      .from('results')
      .select('test_id, score, total, accuracy, submitted_at')
      .eq('student_id', studentId);

    const resultsMap = new Map(results?.map((r) => [r.test_id, r]) || []);

    // Group tests by status
    const pending: any[] = [];
    const scheduled: any[] = [];
    const completed: any[] = [];

    assignments?.forEach((assignment: any) => {
      const test = assignment.tests;
      const result = resultsMap.get(test.id);

      const testData = {
        assignment_id: assignment.id,
        ...test,
        course_name: test.courses?.name,
        result: result || null,
      };

      if (assignment.status === 'completed' || result) {
        completed.push(testData);
      } else if (!test.is_active || (test.scheduled_at && new Date(test.scheduled_at) > new Date())) {
        scheduled.push(testData);
      } else {
        pending.push(testData);
      }
    });

    res.json({
      pending,
      scheduled,
      completed,
    });
  } catch (error) {
    console.error('Get student tests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get test details
export const getTestDetails = async (req: StudentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;

    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if student is assigned
    const { data: assignment } = await supabaseAdmin
      .from('test_assignments')
      .select('*')
      .eq('test_id', id)
      .eq('student_id', studentId)
      .single();

    if (!assignment) {
      res.status(403).json({ error: 'Not assigned to this test' });
      return;
    }

    // Get test details
    const { data: test, error } = await supabaseAdmin
      .from('tests')
      .select(`
        id,
        title,
        description,
        time_limit_mins,
        type,
        scheduled_at,
        is_active,
        courses (name)
      `)
      .eq('id', id)
      .single();

    if (error || !test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    // Get question count
    const { count: questionCount } = await supabaseAdmin
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('test_id', id);

    // Check if already submitted
    const { data: result } = await supabaseAdmin
      .from('results')
      .select('id')
      .eq('test_id', id)
      .eq('student_id', studentId)
      .single();

    res.json({
      ...test,
      course_name: test.courses?.name,
      question_count: questionCount || 0,
      has_submitted: !!result,
      assignment_status: assignment.status,
    });
  } catch (error) {
    console.error('Get test details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Start a test
export const startTest = async (req: StudentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;

    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check assignment
    const { data: assignment } = await supabaseAdmin
      .from('test_assignments')
      .select('*')
      .eq('test_id', id)
      .eq('student_id', studentId)
      .single();

    if (!assignment) {
      res.status(403).json({ error: 'Not assigned to this test' });
      return;
    }

    // Check if already submitted
    const { data: existingResult } = await supabaseAdmin
      .from('results')
      .select('id')
      .eq('test_id', id)
      .eq('student_id', studentId)
      .single();

    if (existingResult) {
      res.status(400).json({ error: 'Already submitted this test' });
      return;
    }

    // Check if test is active
    const { data: test } = await supabaseAdmin
      .from('tests')
      .select('is_active')
      .eq('id', id)
      .single();

    if (!test?.is_active) {
      res.status(400).json({ error: 'Test is not active' });
      return;
    }

    // Get questions without correct answers
    const { data: questions, error } = await supabaseAdmin
      .from('questions')
      .select('id, question_text, option_a, option_b, option_c, option_d, order_index')
      .eq('test_id', id)
      .order('order_index');

    if (error || !questions || questions.length === 0) {
      res.status(400).json({ error: 'No questions found for this test' });
      return;
    }

    // Shuffle questions (Fisher-Yates)
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Update assignment status and start time
    await supabaseAdmin
      .from('test_assignments')
      .update({
        status: 'in_progress',
        start_time: new Date().toISOString(),
      })
      .eq('id', assignment.id);

    res.json({
      questions: shuffled,
      test_id: id,
      start_time: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Start test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Submit test
export const submitTest = async (req: StudentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;
    const { answers, time_taken_secs } = req.body;

    if (!studentId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get correct answers
    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select('id, correct_option')
      .eq('test_id', id);

    if (!questions) {
      res.status(400).json({ error: 'Test not found' });
      return;
    }

    // Calculate score
    let score = 0;
    const answersData = answers.map((a: any) => {
      const question = questions.find((q) => q.id === a.question_id);
      const isCorrect = question?.correct_option === a.selected_option;
      if (isCorrect) score++;
      return {
        question_id: a.question_id,
        selected_option: a.selected_option,
        correct_option: question?.correct_option,
        is_correct: isCorrect,
      };
    });

    const total = questions.length;
    const accuracy = (score / total) * 100;

    // Save result
    const { data: result, error } = await supabaseAdmin
      .from('results')
      .insert({
        student_id: studentId,
        test_id: id,
        score,
        total,
        accuracy,
        time_taken_secs,
        answers: answersData,
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Update assignment status
    await supabaseAdmin
      .from('test_assignments')
      .update({
        status: 'completed',
        end_time: new Date().toISOString(),
      })
      .eq('test_id', id)
      .eq('student_id', studentId);

    res.json({
      result: {
        id: result.id,
        score,
        total,
        accuracy,
      },
    });
  } catch (error) {
    console.error('Submit test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getStudentTests,
  getTestDetails,
  startTest,
  submitTest,
};