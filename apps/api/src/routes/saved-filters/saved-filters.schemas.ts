import { z } from 'zod';

export const createSavedFilterSchema = z.object({
  name: z.string().min(1).max(255),
  entityType: z.string().min(1).max(50),
  filters: z.record(z.string(), z.unknown()),
});

export const updateSavedFilterSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export type CreateSavedFilterInput = z.infer<typeof createSavedFilterSchema>;
export type UpdateSavedFilterInput = z.infer<typeof updateSavedFilterSchema>;
