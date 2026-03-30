import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { JWTPayload } from '../../types';

interface StudentRequest extends Request {
  user?: JWTPayload;
  cookies: {
    token?: string;
    [key: string]: any;
  };
}

// Get all tests for student
export const getStudentTests = async (req: StudentRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // In the optimized schema, everything is in the results table
    const { data: results, error } = await supabaseAdmin
      .from('results')
      .select(`
        id,
        assignment_status,
        status,
        score,
        total_marks,
        percentage,
        submitted_at,
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
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    // Group tests by status
    const pending: any[] = [];
    const scheduled: any[] = [];
    const completed: any[] = [];

    results?.forEach((record: any) => {
      const test = record.tests;
      if (!test) return;

      const testData = {
        result_id: record.id,
        ...test,
        course_name: test.courses?.name,
        assignment_status: record.assignment_status,
        result: record.assignment_status === 'completed' ? {
          id: record.id,
          score: record.score,
          total_marks: record.total_marks,
          percentage: record.percentage,
          submitted_at: record.submitted_at,
          status: record.status
        } : null,
      };

      if (record.assignment_status === 'completed') {
        completed.push(testData);
      } else if (!test.is_active || (test.scheduled_at && new Date(test.scheduled_at) > new Date())) {
        scheduled.push(testData);
      } else {
        pending.push(testData);
      }
    });

    res.json({
      success: true,
      data: {
        pending,
        scheduled,
        completed,
      },
    });
  } catch (error) {
    console.error('Get student tests error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get test details
export const getTestDetails = async (req: StudentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;

    if (!studentId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Check if student is assigned (has a record in results)
    const { data: resultRecord, error: resultError } = await supabaseAdmin
      .from('results')
      .select('id, assignment_status')
      .eq('test_id', id)
      .eq('student_id', studentId)
      .single();

    if (resultError || !resultRecord) {
      res.status(403).json({ success: false, error: 'Not assigned to this test' });
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
      res.status(404).json({ success: false, error: 'Test not found' });
      return;
    }

    // Get question count
    const { count: questionCount } = await supabaseAdmin
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('test_id', id);

    res.json({
      success: true,
      data: {
        ...test,
        course_name: (test.courses as any)?.name,
        question_count: questionCount || 0,
        has_submitted: resultRecord.assignment_status === 'completed',
        result_id: resultRecord.id,
        assignment_status: resultRecord.assignment_status,
      },
    });
  } catch (error) {
    console.error('Get test details error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Start a test
export const startTest = async (req: StudentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;

    if (!studentId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Check assignment in results table
    const { data: resultRecord, error: resultError } = await supabaseAdmin
      .from('results')
      .select('id, assignment_status')
      .eq('test_id', id)
      .eq('student_id', studentId)
      .single();

    if (resultError || !resultRecord) {
      res.status(403).json({ success: false, error: 'Not assigned to this test' });
      return;
    }

    if (resultRecord.assignment_status === 'completed') {
      res.status(400).json({ success: false, error: 'Already submitted this test' });
      return;
    }

    // Check if test is active
    const { data: test } = await supabaseAdmin
      .from('tests')
      .select('is_active, time_limit_mins')
      .eq('id', id)
      .single();

    if (!test?.is_active) {
      res.status(400).json({ success: false, error: 'Test is not active' });
      return;
    }

    // Get questions without correct answers
    const { data: questions, error } = await supabaseAdmin
      .from('questions')
      .select('id, question_text, option_a, option_b, option_c, option_d, order_index')
      .eq('test_id', id)
      .order('order_index');

    if (error || !questions || questions.length === 0) {
      res.status(400).json({ success: false, error: 'No questions found for this test' });
      return;
    }

    // Shuffle questions
    const shuffled = [...questions].sort(() => Math.random() - 0.5);

    // Update assignment status and start time in results table
    await supabaseAdmin
      .from('results')
      .update({
        assignment_status: 'in_progress',
        start_time: new Date().toISOString(),
      })
      .eq('id', resultRecord.id);

    res.json({
      success: true,
      data: {
        questions: shuffled,
        test_id: id,
        time_limit_mins: test.time_limit_mins || 60,
        start_time: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Start test error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Submit test
export const submitTest = async (req: StudentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;
    const { answers, time_taken_secs } = req.body;

    if (!studentId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Get correct answers
    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select('id, correct_option')
      .eq('test_id', id);

    if (!questions) {
      res.status(400).json({ success: false, error: 'Test not found' });
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
    const percentage = (score / total) * 100;
    const status = percentage >= 40 ? 'passed' : 'failed';

    // Update existing result record
    const { data: result, error } = await supabaseAdmin
      .from('results')
      .update({
        score,
        total_marks: total,
        percentage,
        status,
        time_taken_seconds: time_taken_secs,
        answers: answersData,
        assignment_status: 'completed',
        submitted_at: new Date().toISOString(),
      })
      .eq('test_id', id)
      .eq('student_id', studentId)
      .select()
      .single();

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({
      success: true,
      data: {
        result: {
          id: result.id,
          score,
          total_marks: total,
          percentage,
          status,
        },
      },
    });
  } catch (error) {
    console.error('Submit test error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export default {
  getStudentTests,
  getTestDetails,
  startTest,
  submitTest,
};
