import { z } from 'zod';
import { uid } from './uuid.js';

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be at most 100 characters'),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const addMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  roleId: uid('Invalid role ID'),
});

export const updateMemberRoleSchema = z.object({
  roleId: uid('Invalid role ID'),
});

export const organizationOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  settings: z.record(z.string(), z.unknown()).nullable(),
  trialExpiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const memberOutputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  email: z.string(),
  displayName: z.string(),
  roleName: z.string(),
  roleId: z.string(),
  joinedAt: z.string(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type OrganizationOutput = z.infer<typeof organizationOutputSchema>;
export type MemberOutput = z.infer<typeof memberOutputSchema>;
