import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().min(1),
  type: z.string().optional(),
  projectId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
