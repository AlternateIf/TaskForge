import { z } from 'zod';
import { uid } from './uuid.js';

export const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required').max(50000),
  parentCommentId: uid('Invalid comment ID').nullable().optional(),
  attachmentIds: z.array(uid('Invalid attachment ID')).max(10).optional(),
  visibility: z.enum(['public', 'internal']).default('public').optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required').max(50000),
});

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
