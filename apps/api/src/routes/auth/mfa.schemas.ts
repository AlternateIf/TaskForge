import { z } from 'zod';

export const mfaCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'TOTP code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
});

export const mfaVerifyLoginSchema = z.object({
  mfaToken: z.string().min(1, 'MFA token is required'),
  code: z
    .string()
    .length(6, 'TOTP code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
});
