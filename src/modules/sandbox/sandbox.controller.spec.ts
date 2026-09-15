import * as fs from 'fs';
import * as os from 'os';
import { Test, TestingModule } from '@nestjs/testing';
import { SandboxController } from './sandbox.controller';
import { SandboxService } from './sandbox.service';

function listSandboxTempDirs(): string[] {
  return fs
    .readdirSync(os.tmpdir())
    .filter((name) => name.startsWith('agent-sandbox-'));
}

describe('SandboxController', () => {
  let controller: SandboxController;
  const runCommandInSandbox = jest.fn();

  beforeEach(async () => {
    runCommandInSandbox.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SandboxController],
      providers: [
        { provide: SandboxService, useValue: { runCommandInSandbox } },
      ],
    }).compile();

    controller = module.get<SandboxController>(SandboxController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns a success payload and cleans up the temp dir', async () => {
    runCommandInSandbox.mockResolvedValue({
      exitCode: 0,
      stdout: 'hello',
      stderr: '',
    });

    const result = await controller.testSandbox();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(fs.existsSync(result.tempDirUsed)).toBe(false);
      expect(result.result).toEqual({
        exitCode: 0,
        stdout: 'hello',
        stderr: '',
      });
    }
  });

  it('returns a failure payload and still cleans up the temp dir when the service throws', async () => {
    runCommandInSandbox.mockRejectedValue(new Error('container exploded'));
    const before = listSandboxTempDirs();

    const result = await controller.testSandbox();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('container exploded');
    }

    expect(listSandboxTempDirs()).toEqual(before);
  });
});
