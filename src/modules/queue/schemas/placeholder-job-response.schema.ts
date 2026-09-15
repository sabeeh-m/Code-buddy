import { z } from 'zod';

export const placeholderJobResponseSchema = z.object({
  jobId: z.string(),
  queuedAt: z.iso.datetime(),
});

export type PlaceholderJobResponse = z.infer<
  typeof placeholderJobResponseSchema
>;
