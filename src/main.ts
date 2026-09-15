import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import type { EnvConfig } from './config/schemas/env.schema';

const BULL_BOARD_ROUTE = '/queues';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const helmetMiddleware = helmet();
  // Bull Board's UI relies on inline scripts/styles that helmet's default CSP
  // blocks, so it is excluded from the global helmet middleware entirely.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith(BULL_BOARD_ROUTE)) {
      next();
      return;
    }
    helmetMiddleware(req, res, next);
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const configService = app.get<ConfigService<EnvConfig, true>>(ConfigService);

  const corsOrigin = configService.get('CORS_ORIGIN', { infer: true });
  if (corsOrigin) {
    app.enableCors({ origin: corsOrigin.split(',').map((o) => o.trim()) });
  }

  const port = configService.get('PORT', { infer: true });
  await app.listen(port);
}

void bootstrap();
