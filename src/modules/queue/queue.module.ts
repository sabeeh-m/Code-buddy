import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { DEAD_LETTER_QUEUE_NAME, DEFAULT_QUEUE_NAME } from './queue.constants';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueProcessor } from './queue.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: DEFAULT_QUEUE_NAME }),
    BullModule.registerQueue({ name: DEAD_LETTER_QUEUE_NAME }),
    BullBoardModule.forFeature({
      name: DEFAULT_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: DEAD_LETTER_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [QueueController],
  providers: [QueueService, QueueProcessor],
})
export class QueueModule {}
