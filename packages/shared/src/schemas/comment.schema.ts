import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required').max(50000),
  parentCommentId: z.string().uuid('Invalid comment ID').nullable().optional(),
  attachmentIds: z.array(z.string().uuid('Invalid attachment ID')).max(10).optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required').max(50000),
});

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
