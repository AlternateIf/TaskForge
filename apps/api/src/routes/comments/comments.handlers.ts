import type { CreateCommentInput, UpdateCommentInput } from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as commentService from '../../services/comment.service.js';
import type { PermissionContext } from '../../services/permission.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

function hasPermission(
  permissions: Array<{ resource: string; action: string }>,
  resource: string,
  action: string,
): boolean {
  return permissions.some((permission) => {
    if (permission.resource !== resource) return false;
    return permission.action === action || permission.action === 'manage';
  });
}

function canModerateComments(ctx?: PermissionContext): boolean {
  if (!ctx) return false;

  if (
    hasPermission(ctx.effectivePermissions, 'comment', 'delete') ||
    hasPermission(ctx.effectivePermissions, 'comment', 'update')
  ) {
    return true;
  }

  for (const projectCtx of ctx.projectCache.values()) {
    if (
      projectCtx &&
      (hasPermission(projectCtx.permissions, 'comment', 'delete') ||
        hasPermission(projectCtx.permissions, 'comment', 'update'))
    ) {
      return true;
    }
  }

  return false;
}

export async function createCommentHandler(
  request: FastifyRequest<{ Params: { taskId: string }; Body: CreateCommentInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const comment = await commentService.createComment(userId, request.params.taskId, request.body);
  return reply.status(201).send(success(comment));
}

export async function listCommentsHandler(
  request: FastifyRequest<{ Params: { taskId: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const comments = await commentService.listComments(request.params.taskId);
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
  const isAdmin = canModerateComments(request.permissionContext);
  await commentService.deleteComment(request.params.id, userId, isAdmin);
  return reply.status(204).send();
}
