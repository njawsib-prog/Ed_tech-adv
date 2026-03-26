import { startTestPublishWorker } from './testPublish.worker';
import { startTestAutoSubmitWorker } from './testAutoSubmit.worker';
import { startNotificationWorker } from './notification.worker';
import { startEmailWorker } from './email.worker';

export interface Workers {
  testPublish: ReturnType<typeof startTestPublishWorker>;
  testAutoSubmit: ReturnType<typeof startTestAutoSubmitWorker>;
  notification: ReturnType<typeof startNotificationWorker>;
  email: ReturnType<typeof startEmailWorker>;
}

let workers: Workers | null = null;

/**
 * Start all queue workers
 */
export function startAllWorkers(): Workers {
  if (workers) {
    console.log('[Workers] Workers already started');
    return workers;
  }

  console.log('[Workers] Starting all queue workers...');

  workers = {
    testPublish: startTestPublishWorker(),
    testAutoSubmit: startTestAutoSubmitWorker(),
    notification: startNotificationWorker(),
    email: startEmailWorker(),
  };

  console.log('[Workers] All workers started successfully');

  return workers;
}

/**
 * Stop all queue workers
 */
export async function stopAllWorkers(): Promise<void> {
  if (!workers) return;

  console.log('[Workers] Stopping all queue workers...');

  await Promise.all([
    workers.testPublish.close(),
    workers.testAutoSubmit.close(),
    workers.notification.close(),
    workers.email.close(),
  ]);

  workers = null;
  console.log('[Workers] All workers stopped');
}

export { startTestPublishWorker, startTestAutoSubmitWorker, startNotificationWorker, startEmailWorker };