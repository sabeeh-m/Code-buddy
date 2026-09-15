import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  healthCheckResponseSchema,
  type HealthCheckResponse,
} from './schemas/health-check-response.schema';
import {
  readinessResponseSchema,
  type ReadinessResponse,
} from './schemas/readiness-response.schema';
import { RedisHealthService } from '../redis/redis-health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly redisHealthService: RedisHealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  check(): HealthCheckResponse {
    return healthCheckResponseSchema.parse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    });
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready(): Promise<ReadinessResponse> {
    const redisReachable = await this.redisHealthService.ping();

    if (!redisReachable) {
      throw new ServiceUnavailableException('Redis is unreachable');
    }

    return readinessResponseSchema.parse({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }
}
