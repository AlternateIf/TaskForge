import type { CreateCommentInput, UpdateCommentInput } from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as commentService from '../../services/comment.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

export async function createCommentHandler(
  request: FastifyRequest<{ Params: { taskId: string }; Body: CreateCommentInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const roleName = request.permissionContext?.orgRoleName;
  const comment = await commentService.createComment(
    userId,
    request.params.taskId,
    request.body,
    roleName,
  );
  return reply.status(201).send(success(comment));
}

export async function listCommentsHandler(
  request: FastifyRequest<{ Params: { taskId: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const roleName = request.permissionContext?.orgRoleName;
  const comments = await commentService.listComments(request.params.taskId, roleName);
  return reply.status(200).send(success(comments));
}

export async function updateCommentHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateCommentInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const comment = await commentService.updateComment(request.params.id, userId, request.body);
  return reply.status(200).send(success(comment));
}

export async function deleteCommentHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const roleName = request.permissionContext?.orgRoleName;
  const isAdmin = roleName === 'Super Admin' || roleName === 'Admin';
  await commentService.deleteComment(request.params.id, userId, isAdmin);
  return reply.status(204).send();
}
