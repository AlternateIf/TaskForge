import type { CreateSubtaskInput } from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as taskService from '../../services/task.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

export async function createSubtaskHandler(
  request: FastifyRequest<{ Params: { taskId: string }; Body: CreateSubtaskInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const subtask = await taskService.createSubtask(request.params.taskId, userId, request.body);
  return reply.status(201).send(success(subtask));
}

export async function listSubtasksHandler(
  request: FastifyRequest<{ Params: { taskId: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const subtasks = await taskService.listSubtasks(request.params.taskId);
  return reply.status(200).send(success(subtasks));
}
