import { z } from 'zod';
import { uid } from './uuid.js';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(255),
  description: z.string().max(5000).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex color code')
    .optional(),
  icon: z.string().max(50).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex color code')
    .nullable()
    .optional(),
  icon: z.string().max(50).nullable().optional(),
});

export const addProjectMemberSchema = z.object({
  userId: uid('Invalid user ID'),
  roleId: uid('Invalid role ID').nullable().optional(),
});

export const updateProjectMemberSchema = z.object({
  roleId: uid('Invalid role ID').nullable(),
});

export const createWorkflowStatusSchema = z.object({
  name: z.string().min(1, 'Status name is required').max(100),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex color code')
    .optional(),
  isInitial: z.boolean().optional(),
  isFinal: z.boolean().optional(),
  isValidated: z.boolean().optional(),
});

export const updateWorkflowStatusSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex color code')
    .nullable()
    .optional(),
  position: z.number().int().min(0).optional(),
  isInitial: z.boolean().optional(),
  isFinal: z.boolean().optional(),
  isValidated: z.boolean().optional(),
});

export const createLabelSchema = z.object({
  name: z.string().min(1, 'Label name is required').max(100),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex color code')
    .optional(),
});

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex color code')
    .nullable()
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberInput = z.infer<typeof updateProjectMemberSchema>;
export type CreateWorkflowStatusInput = z.infer<typeof createWorkflowStatusSchema>;
export type UpdateWorkflowStatusInput = z.infer<typeof updateWorkflowStatusSchema>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
