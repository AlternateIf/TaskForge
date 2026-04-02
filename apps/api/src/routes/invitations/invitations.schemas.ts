import { passwordSchema } from '@taskforge/shared';
import { z } from 'zod';

export const invitationTargetSchema = z.object({
  organizationId: z.string().uuid(),
  roleIds: z.array(z.string().uuid()).optional(),
  permissionKeys: z.array(z.string().min(1)).optional(),
});

export const createInvitationSchema = z.object({
  email: z.string().email(),
  targets: z.array(invitationTargetSchema).min(1),
  allowedAuthMethods: z.array(z.string().min(1)).optional(),
});

export const acceptInvitationPasswordSchema = z.object({
  password: passwordSchema,
});

export type CreateInvitationBody = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationPasswordBody = z.infer<typeof acceptInvitationPasswordSchema>;
