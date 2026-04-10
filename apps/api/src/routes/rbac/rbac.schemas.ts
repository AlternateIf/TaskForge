import { z } from 'zod';

export const permissionInputSchema = z.object({
  resource: z.string().min(1).max(100),
  action: z.string().min(1).max(50),
  scope: z.string().min(1).max(50),
});

export const createRoleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).nullable().optional(),
  permissions: z.array(permissionInputSchema).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

export const createRoleAssignmentSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});

export const updateRoleAssignmentSchema = z.object({
  roleId: z.string().uuid(),
});

export const createPermissionAssignmentSchema = z.object({
  userId: z.string().uuid(),
  permissionKey: z.string().min(1),
});

export type CreateRoleBody = z.infer<typeof createRoleSchema>;
export type UpdateRoleBody = z.infer<typeof updateRoleSchema>;
export type CreateRoleAssignmentBody = z.infer<typeof createRoleAssignmentSchema>;
export type UpdateRoleAssignmentBody = z.infer<typeof updateRoleAssignmentSchema>;
export type CreatePermissionAssignmentBody = z.infer<typeof createPermissionAssignmentSchema>;
export type PermissionInput = z.infer<typeof permissionInputSchema>;
