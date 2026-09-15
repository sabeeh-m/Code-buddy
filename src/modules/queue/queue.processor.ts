import { Logger } from '@nestjs/common';
import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { DEAD_LETTER_QUEUE_NAME, DEFAULT_QUEUE_NAME } from './queue.constants';
import type { PlaceholderJobData } from './queue.service';

export interface DeadLetterJobData {
  originalJobId: string | undefined;
  queueName: string;
  jobName: string;
  data: unknown;
  failedReason: string;
  attemptsMade: number;
  failedAt: string;
}

/**
 * Processes jobs on the base queue and routes any job that exhausts all of
 * its configured retry attempts (see BullModule.forRootAsync's
 * defaultJobOptions in app.module.ts) into the dead-letter queue, where it
 * sits for manual inspection/re-drive via Bull Board instead of vanishing.
 */
@Processor(DEFAULT_QUEUE_NAME)
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(
    @InjectQueue(DEAD_LETTER_QUEUE_NAME)
    private readonly deadLetterQueue: Queue<DeadLetterJobData>,
  ) {
    super();
  }

  process(job: Job): Promise<void> {
    switch (job.name) {
      case 'placeholder-job':
        this.processPlaceholderJob(job as Job<PlaceholderJobData>);
        return Promise.resolve();
      default:
        return Promise.reject(
          new Error(`No handler registered for job "${job.name}"`),
        );
    }
  }

  private processPlaceholderJob(job: Job<PlaceholderJobData>): void {
    this.logger.log(
      `Processing placeholder job ${job.id ?? '(no id)'}: ${job.data.message}`,
    );
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error): Promise<void> {
    if (!job) {
      return;
    }

    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) {
      // BullMQ will retry this job automatically; nothing to do yet.
      return;
    }

    this.logger.error(
      `Job "${job.name}" (${job.id}) exhausted all ${maxAttempts} attempts, moving to dead-letter queue: ${error.message}`,
    );

    await this.deadLetterQueue.add(job.name, {
      originalJobId: job.id,
      queueName: job.queueName,
      jobName: job.name,
      data: job.data as unknown,
      failedReason: error.message,
      attemptsMade: job.attemptsMade,
      failedAt: new Date().toISOString(),
    });
  }
}
