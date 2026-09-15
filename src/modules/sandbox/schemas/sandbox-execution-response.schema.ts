import { z } from 'zod';

const sandboxExecutionResultSchema = z.object({
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
});

export const sandboxExecutionResponseSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    tempDirUsed: z.string(),
    result: sandboxExecutionResultSchema,
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

export type SandboxExecutionResponse = z.infer<
  typeof sandboxExecutionResponseSchema
>;
