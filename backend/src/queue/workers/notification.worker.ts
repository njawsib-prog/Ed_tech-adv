import { Job } from 'bull';
import { notificationQueue, NotificationJobData } from '../index';
import supabaseAdmin from '../../db/supabaseAdmin';

/**
 * Notification Worker
 * Handles creating notifications for users
 */
export function startNotificationWorker() {
  notificationQueue.process('notifications', 5, async (job: Job<NotificationJobData>) => {
    const { type, instituteId, title, message, recipientIds, metadata } = job.data;

    console.log(`[NotificationWorker] Processing ${type} notification`);

    try {
      if (type === 'broadcast') {
        // Get all users in institute
        const { data: users, error: usersError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('institute_id', instituteId)
          .eq('status', 'active');

        if (usersError) {
          throw new Error(`Failed to fetch users: ${usersError.message}`);
        }

        // Create notifications for all users
        if (users && users.length > 0) {
          const notifications = users.map((user) => ({
            institute_id: instituteId,
            user_id: user.id,
            title,
            message,
            type: 'broadcast',
            metadata: metadata || {},
          }));

          // Insert in batches of 100
          const batchSize = 100;
          for (let i = 0; i < notifications.length; i += batchSize) {
            const batch = notifications.slice(i, i + batchSize);
            const { error: insertError } = await supabaseAdmin
              .from('notifications')
              .insert(batch);

            if (insertError) {
              console.error(`[NotificationWorker] Batch insert failed:`, insertError.message);
            }
          }

          console.log(`[NotificationWorker] Broadcast notification sent to ${users.length} users`);
          return { success: true, recipientCount: users.length };
        }
      } else if (type === 'individual' && recipientIds && recipientIds.length > 0) {
        // Create notifications for specific users
        const notifications = recipientIds.map((userId) => ({
          institute_id: instituteId,
          user_id: userId,
          title,
          message,
          type: 'individual',
          metadata: metadata || {},
        }));

        const { error: insertError } = await supabaseAdmin
          .from('notifications')
          .insert(notifications);

        if (insertError) {
          throw new Error(`Failed to create notifications: ${insertError.message}`);
        }

        console.log(`[NotificationWorker] Individual notification sent to ${recipientIds.length} users`);
        return { success: true, recipientCount: recipientIds.length };
      }

      return { success: true, recipientCount: 0 };
    } catch (error) {
      console.error(`[NotificationWorker] Error processing job:`, error);
      throw error;
    }
  });

  notificationQueue.on('completed', (job) => {
    console.log(`[NotificationWorker] Job ${job.id} completed successfully`);
  });

  notificationQueue.on('failed', (job, err) => {
    console.error(`[NotificationWorker] Job ${job?.id} failed:`, err.message);
  });

  return notificationQueue;
}