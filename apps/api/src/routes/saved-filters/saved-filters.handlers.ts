import type { FastifyReply, FastifyRequest } from 'fastify';
import * as savedFilterService from '../../services/saved-filter.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';
import type { CreateSavedFilterInput, UpdateSavedFilterInput } from './saved-filters.schemas.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

export async function createSavedFilterHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
    Body: CreateSavedFilterInput;
  }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const filter = await savedFilterService.createSavedFilter(
    userId,
    request.params.orgId,
    request.body,
  );
  return reply.status(201).send(success(filter));
}

export async function listSavedFiltersHandler(
  request: FastifyRequest<{ Params: { orgId: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const filters = await savedFilterService.listSavedFilters(userId, request.params.orgId);
  return reply.status(200).send(success(filters));
}

export async function updateSavedFilterHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: UpdateSavedFilterInput;
  }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const filter = await savedFilterService.updateSavedFilter(
    request.params.id,
    userId,
    request.body,
  );
  return reply.status(200).send(success(filter));
}

export async function deleteSavedFilterHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  await savedFilterService.deleteSavedFilter(request.params.id, userId);
  return reply.status(204).send();
}
