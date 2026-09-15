import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

describe('QueueController', () => {
  let controller: QueueController;
  const addPlaceholderJob = jest.fn();

  beforeEach(async () => {
    addPlaceholderJob.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueController],
      providers: [{ provide: QueueService, useValue: { addPlaceholderJob } }],
    }).compile();

    controller = module.get<QueueController>(QueueController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates to QueueService and returns the queued job info', async () => {
    addPlaceholderJob.mockResolvedValue({
      jobId: 'job-123',
      queuedAt: '2026-01-01T00:00:00.000Z',
    });

    const result = await controller.addPlaceholderJob();

    expect(addPlaceholderJob).toHaveBeenCalled();
    expect(result).toEqual({
      jobId: 'job-123',
      queuedAt: '2026-01-01T00:00:00.000Z',
    });
  });
});
