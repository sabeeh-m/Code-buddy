import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { execFileSync } from 'child_process';
import { AgentController } from './agent.controller';
import { PlannerService } from './planner.service';

jest.mock('child_process');

describe('AgentController', () => {
  let controller: AgentController;
  const createPlan = jest.fn();
  const mockExecFileSync = execFileSync as jest.Mock;

  beforeEach(async () => {
    createPlan.mockReset();
    mockExecFileSync.mockReset();
    mockExecFileSync.mockReturnValue('src/a.ts\nsrc/b.ts\n');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentController],
      providers: [{ provide: PlannerService, useValue: { createPlan } }],
    }).compile();

    controller = module.get<AgentController>(AgentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gathers the file tree via git ls-files and delegates to PlannerService', async () => {
    createPlan.mockResolvedValue({ analysis: 'ok', steps: [] });

    const result = await controller.createPlan({ prompt: 'add a feature' });

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'git',
      ['ls-files'],
      expect.objectContaining({ encoding: 'utf8' }),
    );
    expect(createPlan).toHaveBeenCalledWith('add a feature', [
      'src/a.ts',
      'src/b.ts',
    ]);
    expect(result).toEqual({ analysis: 'ok', steps: [] });
  });

  it('filters out blank lines from the git ls-files output', async () => {
    mockExecFileSync.mockReturnValue('src/a.ts\n\nsrc/b.ts\n\n');
    createPlan.mockResolvedValue({ analysis: 'ok', steps: [] });

    await controller.createPlan({ prompt: 'add a feature' });

    expect(createPlan).toHaveBeenCalledWith('add a feature', [
      'src/a.ts',
      'src/b.ts',
    ]);
  });

  it('wraps a git ls-files failure in a clear InternalServerErrorException', async () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('git: command not found');
    });

    await expect(
      controller.createPlan({ prompt: 'add a feature' }),
    ).rejects.toThrow(InternalServerErrorException);
    await expect(
      controller.createPlan({ prompt: 'add a feature' }),
    ).rejects.toThrow(/git ls-files.*git: command not found/);
    expect(createPlan).not.toHaveBeenCalled();
  });
});
