import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import type { EnvConfig } from './config/schemas/env.schema';
import { HealthModule } from './modules/health/health.module';
import { SandboxModule } from './modules/sandbox/sandbox.module';
import { QueueModule } from './modules/queue/queue.module';
import { AgentModule } from './modules/agent/agent.module';

const env = validateEnv(process.env);
const isProduction = env.NODE_ENV === 'production';
const devOnlyModules = isProduction ? [] : [SandboxModule, AgentModule];

if (!isProduction) {
  // Runs before Nest's own Logger exists, so this uses console directly.
  console.warn(
    `[AppModule] NODE_ENV="${env.NODE_ENV}" — SandboxModule (Docker-socket access) is ENABLED. Set NODE_ENV=production to disable it.`,
  );
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) => {
        const ttl: number = configService.get('THROTTLE_TTL_MS', {
          infer: true,
        });
        const limit: number = configService.get('THROTTLE_LIMIT', {
          infer: true,
        });
        return { throttlers: [{ ttl, limit }] };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) => {
        const host: string = configService.get('REDIS_HOST', {
          infer: true,
        });
        const port: number = configService.get('REDIS_PORT', {
          infer: true,
        });
        return {
          connection: { host, port },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 5000 },
          },
        };
      },
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    HealthModule,
    QueueModule,
    ...devOnlyModules,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
