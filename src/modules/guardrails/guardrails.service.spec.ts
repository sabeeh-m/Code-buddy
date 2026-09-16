import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import { GuardrailsService } from './guardrails.service';

describe('GuardrailsService', () => {
  let service: GuardrailsService;
  const base = '/workspace/repo';

  beforeEach(() => {
    service = new GuardrailsService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('resolves a plain relative path within the workspace', () => {
    expect(service.validatePath(base, 'src/index.ts')).toBe(
      path.resolve(base, 'src/index.ts'),
    );
  });

  it('resolves the workspace root itself', () => {
    expect(service.validatePath(base, '.')).toBe(path.resolve(base));
  });

  it('throws when the path traverses above the workspace with ../', () => {
    expect(() => service.validatePath(base, '../../etc/passwd')).toThrow(
      BadRequestException,
    );
  });

  it('throws when an absolute path outside the workspace is passed', () => {
    expect(() => service.validatePath(base, '/etc/passwd')).toThrow(
      BadRequestException,
    );
  });

  it('throws when a nested traversal escapes the workspace', () => {
    expect(() => service.validatePath(base, 'foo/../../bar')).toThrow(
      BadRequestException,
    );
  });

  it('throws when the path targets the .git directory', () => {
    expect(() => service.validatePath(base, '.git/config')).toThrow(
      BadRequestException,
    );
  });

  it('throws when .git appears nested deeper in the path', () => {
    expect(() =>
      service.validatePath(base, 'src/.git/hooks/pre-commit'),
    ).toThrow(BadRequestException);
  });

  it('does not flag a file that merely contains "git" in its name', () => {
    expect(() =>
      service.validatePath(base, 'src/gitignore-helper.ts'),
    ).not.toThrow();
  });
});
