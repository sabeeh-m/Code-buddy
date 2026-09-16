import {
  Body,
  Controller,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { execFileSync } from 'child_process';
import { PlannerService } from './planner.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  planRequestSchema,
  type PlanRequest,
} from './schemas/plan-request.schema';
import type { PlannerOutput } from './schemas/planner.schema';

// Dev-only endpoint for driving PlannerService manually. Uses this project's
// own tracked files as the file tree so it's testable without needing a
// separate repo/isolated environment set up first.
@Controller('agent')
export class AgentController {
  constructor(private readonly plannerService: PlannerService) {}

  @Post('plan')
  async createPlan(
    @Body(new ZodValidationPipe(planRequestSchema)) body: PlanRequest,
  ): Promise<PlannerOutput> {
    let fileTree: string[];
    try {
      fileTree = execFileSync('git', ['ls-files'], {
        cwd: process.cwd(),
        encoding: 'utf8',
      })
        .split('\n')
        .filter(Boolean);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to gather the project file tree via "git ls-files": ${message}`,
      );
    }

    return this.plannerService.createPlan(body.prompt, fileTree);
  }
}
