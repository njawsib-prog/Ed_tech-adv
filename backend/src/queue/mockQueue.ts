/**
 * Mock Bull Queue Implementation
 * Provides a simplified queue interface for Safe Mode when Redis is unavailable
 */

import { EventEmitter } from 'events';

// Type definitions for job data
interface JobData {
  [key: string]: any;
}

interface JobOptions {
  delay?: number;
  jobId?: string;
  attempts?: number;
  backoff?: {
    type: string;
    delay: number;
  };
  removeOnComplete?: number | boolean;
  removeOnFail?: number | boolean;
}

interface Job {
  id: string;
  name: string;
  data: JobData;
  opts: JobOptions;
  progress: number;
  processedAt?: Date;
  finishedAt?: Date;
  failedReason?: string;
}

/**
 * Mock Queue class that mimics Bull queue API
 */
class MockQueue extends EventEmitter {
  private name: string;
  private jobs: Map<string, Job> = new Map();
  private processors: Map<string, (job: Job) => Promise<any>> = new Map();
  private processing: Set<string> = new Set();
  
  constructor(name: string, _opts?: any) {
    super();
    this.name = name;
    console.log(`[SAFE_MODE:Queue] Created queue: ${name}`);
  }
  
  /**
   * Add a job to the queue
   */
  async add(name: string, data: JobData, opts?: JobOptions): Promise<Job> {
    const jobId = opts?.jobId || `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const job: Job = {
      id: jobId,
      name,
      data,
      opts: opts || {},
      progress: 0,
    };
    
    this.jobs.set(jobId, job);
    console.log(`[SAFE_MODE:Queue] Added job ${jobId} to queue ${this.name}`);
    
    // Process immediately if there's a processor registered
    if (this.processors.has(name)) {
      this.processJob(job);
    }
    
    // Handle delayed jobs
    if (opts?.delay && opts.delay > 0) {
      setTimeout(() => {
        this.emit('delayed', job);
        if (this.processors.has(name)) {
          this.processJob(job);
        }
      }, opts.delay);
    }
    
    return job;
  }
  
  /**
   * Process a job with a handler
   */
  process(name: string, concurrency: number, handler: (job: Job) => Promise<any>): void;
  process(name: string, handler: (job: Job) => Promise<any>): void;
  process(name: string, handlerOrConcurrency: any, handler?: any): void {
    const handlerFn = typeof handlerOrConcurrency === 'function' ? handlerOrConcurrency : handler;
    
    this.processors.set(name, async (job: Job) => {
      console.log(`[SAFE_MODE:Queue] Processing job ${job.id} (${name}) in queue ${this.name}`);
      
      try {
        const result = await handlerFn(job);
        
        job.progress = 100;
        job.finishedAt = new Date();
        this.emit('completed', job, result);
        
        console.log(`[SAFE_MODE:Queue] Job ${job.id} completed successfully`);
        
        return result;
      } catch (error) {
        job.failedReason = error instanceof Error ? error.message : String(error);
        this.emit('failed', job, error);
        
        console.error(`[SAFE_MODE:Queue] Job ${job.id} failed:`, job.failedReason);
        
        // Handle retries
        const attempts = job.opts.attempts || 1;
        if (attempts > 1) {
          const retryDelay = job.opts.backoff?.delay || 1000;
          setTimeout(() => {
            console.log(`[SAFE_MODE:Queue] Retrying job ${job.id} (${attempts - 1} attempts left)`);
            this.processJob(job);
          }, retryDelay);
        }
        
        throw error;
      }
    });
    
    console.log(`[SAFE_MODE:Queue] Registered processor for '${name}' on queue ${this.name}`);
  }
  
  /**
   * Internal method to process a job
   */
  private async processJob(job: Job): Promise<void> {
    if (this.processing.has(job.id)) {
      return;
    }
    
    this.processing.add(job.id);
    job.processedAt = new Date();
    
    const processor = this.processors.get(job.name);
    if (processor) {
      try {
        await processor(job);
      } catch (error) {
        // Error already handled in processor
      }
    } else {
      console.warn(`[SAFE_MODE:Queue] No processor registered for job ${job.name}`);
    }
    
    this.processing.delete(job.id);
  }
  
  /**
   * Get a specific job
   */
  async getJob(jobId: string): Promise<Job | null> {
    return this.jobs.get(jobId) || null;
  }
  
  /**
   * Remove jobs by ID
   */
  async removeJobs(...jobIds: string[]): Promise<void> {
    jobIds.forEach(id => {
      this.jobs.delete(id);
      console.log(`[SAFE_MODE:Queue] Removed job ${id} from queue ${this.name}`);
    });
  }
  
  /**
   * Get all jobs in the queue
   */
  async getJobs(..._types: string[]): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }
  
  /**
   * Get job counts by state
   */
  async getJobCounts(): Promise<{ waiting: number; active: number; completed: number; failed: number }> {
    let waiting = 0;
    let active = 0;
    let completed = 0;
    let failed = 0;
    
    this.jobs.forEach(job => {
      if (job.finishedAt) {
        if (job.failedReason) {
          failed++;
        } else {
          completed++;
        }
      } else if (job.processedAt) {
        active++;
      } else {
        waiting++;
      }
    });
    
    return { waiting, active, completed, failed };
  }
  
  /**
   * Empty the queue
   */
  async empty(): Promise<void> {
    this.jobs.clear();
    console.log(`[SAFE_MODE:Queue] Emptied queue ${this.name}`);
  }
  
  /**
   * Close the queue
   */
  async close(): Promise<void> {
    console.log(`[SAFE_MODE:Queue] Closing queue ${this.name}`);
    this.removeAllListeners();
  }
  
  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    console.log(`[SAFE_MODE:Queue] Paused queue ${this.name}`);
    this.emit('paused');
  }
  
  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    console.log(`[SAFE_MODE:Queue] Resumed queue ${this.name}`);
    this.emit('resumed');
  }
}

export { MockQueue, Job, JobData, JobOptions };

// Factory function to create mock queues
export function createMockQueue<T>(name: string, _opts?: any): MockQueue {
  return new MockQueue(name, _opts);
}

// Export default mock queue class
export default MockQueue;