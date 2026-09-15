import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DEFAULT_QUEUE_NAME } from './queue.constants';
import {
  placeholderJobResponseSchema,
  type PlaceholderJobResponse,
} from './schemas/placeholder-job-response.schema';

export interface PlaceholderJobData {
  message: string;
  createdAt: string;
}

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(@InjectQueue(DEFAULT_QUEUE_NAME) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    await this.queue.waitUntilReady();
    this.logger.log(`Connected to Redis (queue "${DEFAULT_QUEUE_NAME}")`);
  }

  async addPlaceholderJob(): Promise<PlaceholderJobResponse> {
    const job = await this.queue.add('placeholder-job', {
      message: 'Placeholder job from QueueService',
      createdAt: new Date().toISOString(),
    } satisfies PlaceholderJobData);

    if (!job.id) {
      throw new Error('BullMQ did not assign an id to the queued job');
    }

    return placeholderJobResponseSchema.parse({
      jobId: job.id,
      queuedAt: new Date().toISOString(),
    });
  }
}
