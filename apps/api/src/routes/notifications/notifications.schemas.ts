import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  orgId: z.string(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updatePreferencesSchema = z.record(
  z.string(),
  z.object({
    in_app: z.boolean().optional(),
    email: z.boolean().optional(),
  }),
);

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
