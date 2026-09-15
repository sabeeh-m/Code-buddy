import { Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';
import type DockerModem from 'docker-modem';
import { PassThrough } from 'stream';

export interface SandboxExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface ContainerWaitResult {
  StatusCode: number;
}

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);
  private readonly docker = new Docker();

  // use cached image if available.
  private async ensureImageExists(image: string): Promise<void> {
    try {
      await this.docker.getImage(image).inspect();
      return;
    } catch {
      // Not found locally; fall through to pull it.
    }

    this.logger.log(
      `Image ${image} not found locally. Pulling from registry...`,
    );

    const stream = await this.docker.pull(image, {});

    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(
        stream,
        (progressError: Error | null) => {
          if (progressError) {
            reject(progressError);
          } else {
            resolve();
          }
        },
      );
    });

    this.logger.log(`Successfully pulled image: ${image}`);
  }

  async runCommandInSandbox(
    hostWorkspacePath: string,
    command: string[],
    timeoutMs: number = 120000, // Default 2 minutes timeout
    image: string = 'node:20-alpine',
  ): Promise<SandboxExecutionResult> {
    this.logger.log(`Spinning up sandbox container using image: ${image}`);

    let container: Docker.Container | null = null;

    try {
      await this.ensureImageExists(image);

      container = await this.docker.createContainer({
        Image: image,
        Cmd: command,
        WorkingDir: '/workspace',
        HostConfig: {
          Binds: [`${hostWorkspacePath}:/workspace:rw`],
          NetworkMode: 'bridge', // allow outbound internet  without exposing the host's network namespace
          Memory: 1024 * 1024 * 1024, // 1GB memory cap
          CpuQuota: 100000, // Limit CPU usage
        },
        Tty: false,
      });

      await container.start();
      this.logger.log(
        `Container started (${container.id.substring(0, 12)}). Executing command...`,
      );

      const stream = await container.attach({
        stream: true,
        stdout: true,
        stderr: true,
      });

      let stdout = '';
      let stderr = '';

      const stdoutStream = new PassThrough();
      const stderrStream = new PassThrough();

      stdoutStream.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });

      stderrStream.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      const modem = container.modem as DockerModem;
      modem.demuxStream(stream, stdoutStream, stderrStream);

      // Wait for container completion with a strict timeout race condition
      const waitPromise = container.wait();

      waitPromise.catch((waitError: unknown) => {
        const message =
          waitError instanceof Error ? waitError.message : String(waitError);
        this.logger.warn(
          `container.wait() rejected after the timeout had already won: ${message}`,
        );
      });

      let timeoutHandle: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
          () =>
            reject(
              new Error(`Sandbox execution timed out after ${timeoutMs}ms`),
            ),
          timeoutMs,
        );
      });

      let waitResult: unknown;
      try {
        waitResult = await Promise.race([waitPromise, timeoutPromise]);
      } finally {
        clearTimeout(timeoutHandle);
      }

      const exitCode = (waitResult as ContainerWaitResult).StatusCode ?? 0;

      this.logger.log(
        `Container finished execution with exit code: ${exitCode}`,
      );

      return {
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Sandbox execution error: ${message}`, stack);
      throw error;
    } finally {
      // Force remove container to prevent resource leaks
      if (container) {
        try {
          this.logger.log(
            `Cleaning up sandbox container ${container.id.substring(0, 12)}...`,
          );
          await container.remove({ force: true });
        } catch (cleanupError) {
          const message =
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError);
          this.logger.error(`Failed to cleanup container: ${message}`);
        }
      }
    }
  }
}
