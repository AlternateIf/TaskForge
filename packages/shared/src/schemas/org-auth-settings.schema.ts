import { z } from 'zod';

export const updateAuthSettingsSchema = z.object({
  passwordAuthEnabled: z.boolean().optional(),
  googleOauthEnabled: z.boolean().optional(),
  githubOauthEnabled: z.boolean().optional(),
  mfaEnforced: z.boolean().optional(),
  mfaGracePeriodDays: z.number().int().min(1).max(90).optional(),
  allowedEmailDomains: z
    .array(
      z
        .string()
        .min(1)
        .max(255)
        .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Invalid domain format'),
    )
    .max(50)
    .nullable()
    .optional(),
});

export const authSettingsOutputSchema = z.object({
  organizationId: z.string(),
  passwordAuthEnabled: z.boolean(),
  googleOauthEnabled: z.boolean(),
  githubOauthEnabled: z.boolean(),
  mfaEnforced: z.boolean(),
  mfaEnforcedAt: z.string().nullable(),
  mfaGracePeriodDays: z.number(),
  allowedEmailDomains: z.array(z.string()).nullable(),
  updatedAt: z.string(),
});

export type UpdateAuthSettingsInput = z.infer<typeof updateAuthSettingsSchema>;
export type AuthSettingsOutput = z.infer<typeof authSettingsOutputSchema>;
