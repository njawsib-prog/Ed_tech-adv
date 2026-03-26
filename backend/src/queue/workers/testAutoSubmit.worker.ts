import { Job } from 'bull';
import { testAutoSubmitQueue, TestAutoSubmitJobData } from '../index';
import supabaseAdmin from '../../db/supabaseAdmin';

/**
 * Test Auto Submit Worker
 * Handles automatic submission of tests when time runs out
 */
export function startTestAutoSubmitWorker() {
  testAutoSubmitQueue.process('auto-submit', 10, async (job: Job<TestAutoSubmitJobData>) => {
    const { testId, testAttemptId, studentId, instituteId } = job.data;

    console.log(`[TestAutoSubmitWorker] Processing auto-submit for attempt ${testAttemptId}`);

    try {
      // Check if attempt is still in progress
      const { data: attempt, error: attemptError } = await supabaseAdmin
        .from('test_attempts')
        .select('id, status, answers, time_spent')
        .eq('id', testAttemptId)
        .eq('student_id', studentId)
        .single();

      if (attemptError || !attempt) {
        console.log(`[TestAutoSubmitWorker] Attempt not found, may have been submitted already`);
        return { success: false, reason: 'attempt_not_found' };
      }

      if (attempt.status !== 'in_progress') {
        console.log(`[TestAutoSubmitWorker] Attempt already ${attempt.status}`);
        return { success: false, reason: `already_${attempt.status}` };
      }

      // Get test questions for scoring
      const { data: test, error: testError } = await supabaseAdmin
        .from('tests')
        .select('id, passing_marks, duration_minutes')
        .eq('id', testId)
        .single();

      if (testError || !test) {
        throw new Error(`Test not found: ${testError?.message}`);
      }

      // Get questions with correct answers
      const { data: questions, error: questionsError } = await supabaseAdmin
        .from('questions')
        .select('id, marks, correct_answer, question_type')
        .eq('test_id', testId);

      if (questionsError) {
        throw new Error(`Failed to fetch questions: ${questionsError.message}`);
      }

      // Calculate score
      const answers = attempt.answers as Record<string, any> || {};
      let obtainedMarks = 0;
      let totalMarks = 0;

      questions?.forEach((question) => {
        totalMarks += question.marks;
        const studentAnswer = answers[question.id];
        
        if (studentAnswer && studentAnswer === question.correct_answer) {
          obtainedMarks += question.marks;
        }
      });

      const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
      const status = percentage >= (test.passing_marks || 0) ? 'passed' : 'failed';

      // Update attempt
      const { error: updateError } = await supabaseAdmin
        .from('test_attempts')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          obtained_marks: obtainedMarks,
          percentage,
          result_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', testAttemptId);

      if (updateError) {
        throw new Error(`Failed to submit test: ${updateError.message}`);
      }

      // Create result record
      const { error: resultError } = await supabaseAdmin
        .from('results')
        .insert({
          institute_id: instituteId,
          test_id: testId,
          student_id: studentId,
          test_attempt_id: testAttemptId,
          total_marks: totalMarks,
          obtained_marks: obtainedMarks,
          percentage,
          status,
          submitted_at: new Date().toISOString(),
        });

      if (resultError) {
        console.error(`[TestAutoSubmitWorker] Failed to create result: ${resultError.message}`);
      }

      // Update test statistics
      const { error: statsError } = await supabaseAdmin.rpc('update_test_statistics', {
        p_test_id: testId,
      });

      if (statsError) {
        console.error(`[TestAutoSubmitWorker] Failed to update statistics: ${statsError.message}`);
      }

      // Create notification for student
      await supabaseAdmin.from('notifications').insert({
        institute_id: instituteId,
        user_id: studentId,
        title: 'Test Auto-Submitted',
        message: `Your test was automatically submitted as the time limit was reached. You scored ${percentage.toFixed(1)}%.`,
        type: 'test',
        metadata: { test_id: testId, attempt_id: testAttemptId },
      });

      console.log(`[TestAutoSubmitWorker] Successfully auto-submitted attempt ${testAttemptId}`);

      return {
        success: true,
        testAttemptId,
        obtainedMarks,
        totalMarks,
        percentage,
        status,
      };
    } catch (error) {
      console.error(`[TestAutoSubmitWorker] Error processing job:`, error);
      throw error;
    }
  });

  testAutoSubmitQueue.on('completed', (job) => {
    console.log(`[TestAutoSubmitWorker] Job ${job.id} completed successfully`);
  });

  testAutoSubmitQueue.on('failed', (job, err) => {
    console.error(`[TestAutoSubmitWorker] Job ${job?.id} failed:`, err.message);
  });

  return testAutoSubmitQueue;
}