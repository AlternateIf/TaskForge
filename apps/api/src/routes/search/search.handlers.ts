import type { FastifyReply, FastifyRequest } from 'fastify';
import { globalSearch } from '../../services/search.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';
import type { SearchQuery } from './search.schemas.js';

export async function searchHandler(
  request: FastifyRequest<{ Querystring: SearchQuery }>,
  reply: FastifyReply,
) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }

  const { q, type, projectId, limit } = request.query;
  const types = type ? type.split(',').map((t) => t.trim()) : undefined;

  const results = await globalSearch({
    query: q,
    types,
    projectId,
    userId: request.authUser.userId,
    limit,
  });

  return reply.status(200).send(success(results));
}
