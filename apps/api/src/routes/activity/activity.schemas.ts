import { z } from 'zod';

export const activityQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export type ActivityQuery = z.infer<typeof activityQuerySchema>;
