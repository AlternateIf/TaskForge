import type { CreateDependencyInput } from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as dependencyService from '../../services/dependency.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

export async function createDependencyHandler(
  request: FastifyRequest<{ Params: { taskId: string }; Body: CreateDependencyInput }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const dependency = await dependencyService.createDependency(request.params.taskId, request.body);
  return reply.status(201).send(success(dependency));
}

export async function listDependenciesHandler(
  request: FastifyRequest<{ Params: { taskId: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const dependencies = await dependencyService.listDependencies(request.params.taskId);
  return reply.status(200).send(success(dependencies));
}

export async function deleteDependencyHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  await dependencyService.deleteDependency(request.params.id);
  return reply.status(204).send();
}
