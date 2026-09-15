import { Controller, Get } from '@nestjs/common';
import { SandboxService } from './sandbox.service';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import {
  sandboxExecutionResponseSchema,
  type SandboxExecutionResponse,
} from './schemas/sandbox-execution-response.schema';

//WIP: This is a placeholder for the sandbox controller.
@Controller('sandbox-test')
export class SandboxController {
  constructor(private readonly sandboxService: SandboxService) {}

  @Get()
  async testSandbox(): Promise<SandboxExecutionResponse> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-sandbox-'));

    try {
      // dummy script passed to the sandbox.
      fs.writeFileSync(
        path.join(tempDir, 'script.js'),
        'console.log("Hello from inside the Docker container!");',
      );

      // Execution
      const result = await this.sandboxService.runCommandInSandbox(
        tempDir,
        ['node', 'script.js'],
        10000, //
        'node:20-alpine',
      );

      return sandboxExecutionResponseSchema.parse({
        success: true,
        tempDirUsed: tempDir,
        result,
      });
    } catch (error) {
      return sandboxExecutionResponseSchema.parse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
