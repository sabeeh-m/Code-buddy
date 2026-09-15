import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { QueueService } from './queue.service';
import type { PlaceholderJobResponse } from './schemas/placeholder-job-response.schema';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('placeholder-job')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async addPlaceholderJob(): Promise<PlaceholderJobResponse> {
    return this.queueService.addPlaceholderJob();
  }
}
