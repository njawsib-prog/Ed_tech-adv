import { Job } from 'bull';
import { testPublishQueue, TestPublishJobData } from '../index';
import supabaseAdmin from '../../db/supabaseAdmin';

/**
 * Test Publish Worker
 * Handles scheduled test publishing
 */
export function startTestPublishWorker() {
  testPublishQueue.process('publish-test', 5, async (job: Job<TestPublishJobData>) => {
    const { testId, instituteId, scheduledAt } = job.data;

    console.log(`[TestPublishWorker] Processing job for test ${testId}`);

    try {
      // Update test status to published
      const { error: updateError } = await supabaseAdmin
        .from('tests')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', testId)
        .eq('institute_id', instituteId);

      if (updateError) {
        throw new Error(`Failed to update test status: ${updateError.message}`);
      }

      // Get all enrolled students for the course
      const { data: test, error: testError } = await supabaseAdmin
        .from('tests')
        .select('course_id, title')
        .eq('id', testId)
        .single();

      if (testError || !test) {
        throw new Error(`Test not found: ${testError?.message}`);
      }

      const { data: enrollments, error: enrollError } = await supabaseAdmin
        .from('enrollments')
        .select('student_id')
        .eq('course_id', test.course_id)
        .eq('status', 'active');

      if (enrollError) {
        throw new Error(`Failed to fetch enrollments: ${enrollError.message}`);
      }

      // Create notifications for all enrolled students
      if (enrollments && enrollments.length > 0) {
        const notifications = enrollments.map((enrollment) => ({
          institute_id: instituteId,
          user_id: enrollment.student_id,
          title: 'New Test Available',
          message: `A new test "${test.title}" has been published and is now available for you to take.`,
          type: 'test',
          metadata: { test_id: testId },
        }));

        const { error: notifError } = await supabaseAdmin
          .from('notifications')
          .insert(notifications);

        if (notifError) {
          console.error(`[TestPublishWorker] Failed to create notifications: ${notifError.message}`);
          // Don't throw - test is already published
        }
      }

      console.log(`[TestPublishWorker] Successfully published test ${testId}`);
      
      return {
        success: true,
        testId,
        notifiedStudents: enrollments?.length || 0,
      };
    } catch (error) {
      console.error(`[TestPublishWorker] Error processing job:`, error);
      throw error;
    }
  });

  testPublishQueue.on('completed', (job) => {
    console.log(`[TestPublishWorker] Job ${job.id} completed successfully`);
  });

  testPublishQueue.on('failed', (job, err) => {
    console.error(`[TestPublishWorker] Job ${job?.id} failed:`, err.message);
  });

  return testPublishQueue;
}