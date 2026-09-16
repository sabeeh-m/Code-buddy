import { z } from 'zod';

export const planRequestSchema = z.object({
  prompt: z.string().min(1),
});

export type PlanRequest = z.infer<typeof planRequestSchema>;
