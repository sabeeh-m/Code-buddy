import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { RedisHealthService } from '../redis/redis-health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let redisHealthService: { ping: jest.Mock };

  beforeEach(async () => {
    redisHealthService = { ping: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: RedisHealthService, useValue: redisHealthService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should report ok status', () => {
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(typeof result.timestamp).toBe('string');
    expect(typeof result.uptimeSeconds).toBe('number');
  });

  describe('ready', () => {
    it('reports ok when Redis is reachable', async () => {
      redisHealthService.ping.mockResolvedValue(true);

      const result = await controller.ready();

      expect(result.status).toBe('ok');
      expect(typeof result.timestamp).toBe('string');
    });

    it('throws ServiceUnavailableException when Redis is unreachable', async () => {
      redisHealthService.ping.mockResolvedValue(false);

      await expect(controller.ready()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
