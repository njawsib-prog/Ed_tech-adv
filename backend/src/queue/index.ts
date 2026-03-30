import config, { SAFE_MODE } from '../config/env';
import { MockQueue } from './mockQueue';
import Queue from 'bull';

// Queue names
export const QUEUE_NAMES = {
  TEST_PUBLISH: 'test-publish',
  TEST_AUTO_SUBMIT: 'test-auto-submit',
  NOTIFICATIONS: 'notifications',
  EMAIL: 'email',
} as const;

// Test Publish Job Data
export interface TestPublishJobData {
  testId: string;
  instituteId: string;
  scheduledAt: string;
}

// Test Auto Submit Job Data
export interface TestAutoSubmitJobData {
  testId: string;
  testAttemptId: string;
  studentId: string;
  instituteId: string;
  endsAt: string;
}

// Notification Job Data
export interface NotificationJobData {
  type: 'broadcast' | 'individual';
  instituteId: string;
  title: string;
  message: string;
  recipientIds?: string[];
  metadata?: Record<string, any>;
}

// Email Job Data
export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

// Redis configuration
const redisOptions = {
  host: config.redisHost || 'localhost',
  port: config.redisPort,
  password: config.redisPassword,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

let testPublishQueue: any;
let testAutoSubmitQueue: any;
let notificationQueue: any;
let emailQueue: any;

if (SAFE_MODE) {
  // Use mock queues when in SAFE MODE
  console.log('[Queue] Using mock queues (SAFE MODE)');
  
  testPublishQueue = new MockQueue(QUEUE_NAMES.TEST_PUBLISH, {
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });
  
  testAutoSubmitQueue = new MockQueue(QUEUE_NAMES.TEST_AUTO_SUBMIT, {
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });
  
  notificationQueue = new MockQueue(QUEUE_NAMES.NOTIFICATIONS, {
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 10,
      attempts: 3,
    },
  });
  
  emailQueue = new MockQueue(QUEUE_NAMES.EMAIL, {
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 10,
      attempts: 3,
    },
  });
} else {
  // Use real Bull queues
  testPublishQueue = new Queue(QUEUE_NAMES.TEST_PUBLISH, {
    redis: redisOptions,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });
  
  testAutoSubmitQueue = new Queue(QUEUE_NAMES.TEST_AUTO_SUBMIT, {
    redis: redisOptions,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });
  
  notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
    redis: redisOptions,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 10,
      attempts: 3,
    },
  });
  
  emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
    redis: redisOptions,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 10,
      attempts: 3,
    },
  });
  
  console.log('[Queue] Connected to Redis');
}

// Helper to schedule test publish
export async function scheduleTestPublish(
  testId: string,
  instituteId: string,
  scheduledAt: Date
): Promise<void> {
  const delay = scheduledAt.getTime() - Date.now();
  
  if (delay > 0) {
    await testPublishQueue.add(
      'publish-test',
      {
        testId,
        instituteId,
        scheduledAt: scheduledAt.toISOString(),
      },
      {
        delay,
        jobId: `publish-${testId}`,
      }
    );
  }
}

// Helper to schedule test auto-submit
export async function scheduleTestAutoSubmit(
  testId: string,
  testAttemptId: string,
  studentId: string,
  instituteId: string,
  endsAt: Date
): Promise<void> {
  const delay = endsAt.getTime() - Date.now();
  
  if (delay > 0) {
    await testAutoSubmitQueue.add(
      'auto-submit',
      {
        testId,
        testAttemptId,
        studentId,
        instituteId,
        endsAt: endsAt.toISOString(),
      },
      {
        delay,
        jobId: `autosubmit-${testAttemptId}`,
      }
    );
  }
}

// Helper to cancel scheduled auto-submit
export async function cancelTestAutoSubmit(testAttemptId: string): Promise<void> {
  await testAutoSubmitQueue.removeJobs(`autosubmit-${testAttemptId}`);
}

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  await Promise.all([
    testPublishQueue.close(),
    testAutoSubmitQueue.close(),
    notificationQueue.close(),
    emailQueue.close(),
  ]);
}

export { testPublishQueue, testAutoSubmitQueue, notificationQueue, emailQueue };