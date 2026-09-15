import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { EnvConfig } from '../../config/schemas/env.schema';

const MAX_RECONNECT_ATTEMPTS = 3;

@Injectable()
export class RedisHealthService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisHealthService.name);
  private readonly client: Redis;
  private connectingPromise: Promise<void> | null = null;

  constructor(configService: ConfigService<EnvConfig, true>) {
    this.client = new Redis({
      host: configService.get('REDIS_HOST', { infer: true }),
      port: configService.get('REDIS_PORT', { infer: true }),
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      // Give up after a few quick attempts instead of retrying forever in the
      // background; ping() reconnects fresh on the next call regardless.
      retryStrategy: (times) =>
        times > MAX_RECONNECT_ATTEMPTS ? null : Math.min(times * 200, 2000),
    });
    // ioredis crashes the process on an unhandled 'error' event; this handler
    // keeps the client alive, ping() is what surfaces reachability to callers.
    this.client.on('error', (err: Error) => {
      this.logger.error(
        `Redis health-check connection error: ${err.message}`,
        err.stack,
      );
    });
  }

  async ping(): Promise<boolean> {
    try {
      if (this.client.status === 'wait' || this.client.status === 'end') {
        // Concurrent callers share one in-flight connect() instead of each
        // calling it, which ioredis rejects if already connecting/connected.
        this.connectingPromise ??= this.client.connect().finally(() => {
          this.connectingPromise = null;
        });
        await this.connectingPromise;
      }
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => this.client.disconnect());
  }
}
