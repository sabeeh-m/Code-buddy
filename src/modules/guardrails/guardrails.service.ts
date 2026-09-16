import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as path from 'path';

@Injectable()
export class GuardrailsService {
  private readonly logger = new Logger(GuardrailsService.name);

  /**
   * Validates that a requested file path stays strictly within the workspace directory.
   * Mathematically blocks path traversal attempts (e.g., '../../etc/passwd').
   */
  validatePath(baseWorkspacePath: string, targetPath: string): string {
    const absoluteBase = path.resolve(baseWorkspacePath);
    const absoluteTarget = path.resolve(absoluteBase, targetPath);

    const relativePath = path.relative(absoluteBase, absoluteTarget);

    // ensure the path is not outside the workspace
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      this.logger.warn(
        `Security violation: Path traversal attempt blocked for path -> ${targetPath}`,
      );
      throw new BadRequestException(
        `Access denied: Path "${targetPath}" escapes the workspace sandbox.`,
      );
    }

    // prevent access to the .git directory
    if (relativePath.split(path.sep).includes('.git')) {
      this.logger.warn(
        `Security violation: Attempted access to protected .git directory -> ${targetPath}`,
      );
      throw new BadRequestException(
        `Access denied: Modification of protected version control files is forbidden.`,
      );
    }

    return absoluteTarget;
  }
}
