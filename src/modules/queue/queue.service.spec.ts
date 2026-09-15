import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { DEFAULT_QUEUE_NAME } from './queue.constants';

describe('QueueService', () => {
  let service: QueueService;
  const add = jest.fn();

  beforeEach(async () => {
    add.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken(DEFAULT_QUEUE_NAME),
          useValue: { add },
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('queues a placeholder job and returns its id', async () => {
    add.mockResolvedValue({ id: 'job-123' });

    const result = await service.addPlaceholderJob();

    expect(add).toHaveBeenCalledWith(
      'placeholder-job',
      expect.objectContaining({ message: expect.any(String) as unknown }),
    );
    expect(result.jobId).toBe('job-123');
    expect(typeof result.queuedAt).toBe('string');
  });

  it('throws if BullMQ does not assign a job id', async () => {
    add.mockResolvedValue({ id: undefined });

    await expect(service.addPlaceholderJob()).rejects.toThrow(
      'BullMQ did not assign an id to the queued job',
    );
  });
});
