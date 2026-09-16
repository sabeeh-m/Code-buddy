import { z } from 'zod';

export const PlannerResponseSchema = z.object({
  analysis: z
    .string()
    .describe(
      'A concise technical analysis of the problem and root cause based on the user prompt and file tree.',
    ),
  steps: z
    .array(
      z.object({
        file: z
          .string()
          .describe('The relative file path to modify or create.'),
        action: z
          .string()
          .describe(
            'Specific, high-level instruction of what needs to change in this file.',
          ),
      }),
    )
    .describe(
      'An ordered, sequential array of execution steps to fully resolve the issue.',
    ),
});

export type PlannerOutput = z.infer<typeof PlannerResponseSchema>;
