import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { QueueProcessor } from './queue.processor';
import { DEAD_LETTER_QUEUE_NAME } from './queue.constants';

function buildJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    name: 'placeholder-job',
    data: { message: 'hello', createdAt: '2026-01-01T00:00:00.000Z' },
    opts: { attempts: 3 },
    attemptsMade: 1,
    queueName: 'default',
    ...overrides,
  } as Job;
}

describe('QueueProcessor', () => {
  let processor: QueueProcessor;
  const add = jest.fn();

  beforeEach(async () => {
    add.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueProcessor,
        { provide: getQueueToken(DEAD_LETTER_QUEUE_NAME), useValue: { add } },
      ],
    }).compile();

    processor = module.get<QueueProcessor>(QueueProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('handles a known job name without throwing', async () => {
      await expect(processor.process(buildJob())).resolves.toBeUndefined();
    });

    it('throws for an unknown job name', async () => {
      await expect(
        processor.process(buildJob({ name: 'unknown-job' })),
      ).rejects.toThrow('No handler registered for job "unknown-job"');
    });
  });

  describe('onFailed', () => {
    it('does nothing when the job still has retries left', async () => {
      const job = buildJob({ attemptsMade: 1, opts: { attempts: 3 } });

      await processor.onFailed(job, new Error('boom'));

      expect(add).not.toHaveBeenCalled();
    });

    it('moves the job to the dead-letter queue once retries are exhausted', async () => {
      const job = buildJob({ attemptsMade: 3, opts: { attempts: 3 } });

      await processor.onFailed(job, new Error('boom'));

      expect(add).toHaveBeenCalledWith(
        'placeholder-job',
        expect.objectContaining({
          originalJobId: 'job-1',
          queueName: 'default',
          jobName: 'placeholder-job',
          failedReason: 'boom',
          attemptsMade: 3,
        }),
      );
    });

    it('does nothing when there is no job', async () => {
      await processor.onFailed(undefined, new Error('boom'));

      expect(add).not.toHaveBeenCalled();
    });
  });
});
