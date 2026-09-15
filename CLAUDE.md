# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Redis via `docker compose up -d redis`, then run the app with watch mode (single-command local dev; the backend itself runs natively, not in Docker, for fast reload)
- `npm run start:dev` — run the app with watch mode only (assumes Redis is already running)
- `npm run build` — compile with the Nest CLI (`tsc` under the hood) to `dist/`
- `npm run start:prod` — run the compiled app from `dist/main.js`
- `npm test` — run unit tests (`*.spec.ts` under `src/`)
- `npm test -- <pattern>` or `npx jest <pattern>` — run a single unit test file/suite
- `npm run test:watch` — unit tests in watch mode
- `npm run test:cov` — unit tests with coverage report
- `npm run test:e2e` — run e2e tests (`test/*.e2e-spec.ts`, separate Jest config at `test/jest-e2e.json`)
- `npm run lint` — ESLint with `--fix` over `src`, `apps`, `libs`, `test`
- `npm run format` — Prettier write over `src` and `test`

## Architecture

This is a NestJS app with **no database** — Redis (via BullMQ) is the one external dependency, used for background jobs and readiness checks.

- `src/main.ts` — bootstraps the Nest app, applies `helmet()` (except under `/queues`, whose Bull Board UI needs inline scripts/styles), applies CORS from `CORS_ORIGIN` if set, registers the global `HttpExceptionFilter`, enables shutdown hooks, and listens on the port from `ConfigService`.
- `src/app.module.ts` — root module. Registers global `ConfigModule`, `ThrottlerModule` (+ a global `APP_GUARD`), the shared BullMQ Redis connection, and `BullBoardModule.forRoot`. Feature modules are imported here only; `SandboxModule` is excluded outside development. There is no root controller — add new features as their own modules under `src/modules/`, not into `AppModule` directly.
- `src/modules/health/` — `/health` (liveness) and `/health/ready` (readiness; pings Redis via `RedisModule`).
- `src/modules/redis/` — `RedisHealthService`, a dedicated lazy-connect Redis client used only for readiness checks.
- `src/modules/queue/` — the base BullMQ queue (`default`) and a placeholder job endpoint (`POST /queue/placeholder-job`) to build real job types on top of. `QueueProcessor` (`@Processor(DEFAULT_QUEUE_NAME)`) actually runs jobs, routing by `job.name` in a `switch` — add new job types as new `case`s there, not as separate processors. Retries come from `defaultJobOptions` in `app.module.ts` (`attempts: 3`, exponential backoff); a job that exhausts all attempts is caught by `QueueProcessor`'s `@OnWorkerEvent('failed')` handler and moved to the `dead-letter` queue (also registered with Bull Board) instead of vanishing — it sits there for manual inspection/re-drive, nothing auto-processes it.
- `src/modules/sandbox/` — dev-only: runs commands in a throwaway Docker container via `dockerode`, response validated through `schemas/sandbox-execution-response.schema.ts`. Excluded in production (grants unauthenticated Docker-socket access).
- `src/config/` — `env.schema.ts` (Zod) + `validateEnv`, wired into `ConfigModule.forRoot`. Add new env vars here, read them via injected `ConfigService<EnvConfig, true>`, never raw `process.env` in feature code.
- `src/common/filters/http-exception.filter.ts` — global `@Catch()` exception filter that normalizes all thrown errors into a consistent JSON error body (`statusCode`, `timestamp`, `path`, `message`) and logs 5xx/unknown errors server-side with a stack trace.
- `src/common/pipes/zod-validation.pipe.ts` — per-parameter Zod pipe (`@Body(new ZodValidationPipe(schema))`). Do not register it globally; the constructor requires a schema.

**Known gap:** Bull Board (`/queues`) is mounted as raw Express middleware by `@bull-board/nestjs`, so it runs before Nest's guard pipeline — the global `ThrottlerGuard` does not apply to it, and it has no authentication yet.

### Zod

Use Zod as the source of truth for request and response payloads. Colocate schemas under `src/modules/<feature>/schemas/`, export `z.infer<typeof schema>` from the same file, parse outgoing bodies with `schema.parse(...)`, and validate incoming body/query/params with `ZodValidationPipe`. Do not add `class-validator` DTO classes.

### TypeScript strictness

`tsconfig.json` has full `strict` mode plus extra checks enabled: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Because `isolatedModules` + `emitDecoratorMetadata` are both on, types used only in decorated method signatures (e.g. controller return types) must be imported with `import type`, or the build fails with TS1272.

The project compiles as CommonJS (`"module": "nodenext"`, no `"type": "module"` in `package.json`). Some Nest packages ship ESM-only major versions that break this build with TS1479 — `@nestjs/bullmq@12` and `@nestjs/config@12` both do this, which is why this repo pins `@nestjs/bullmq@^11` and `@nestjs/config@^4`. Check a new major's `package.json` for `"type": "module"` before upgrading either.

### Testing conventions

- Unit specs live next to the code they test (`*.controller.spec.ts`) and use `@nestjs/testing`'s `Test.createTestingModule`.
- E2e specs live in `test/` and boot the full `AppModule` via `app.init()` + `supertest`; type the supertest server argument as `App` from `supertest/types` (not `any`) to satisfy the strict ESLint config (`typescript-eslint/recommendedTypeChecked`).
