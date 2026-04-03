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

  const queryInput = request.query as {
    q?: unknown;
    type?: unknown;
    projectId?: unknown;
    organizationId?: unknown;
    limit?: unknown;
  };

  const rawQuery = queryInput.q;
  const q = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  if (!q) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'Search query is required');
  }

  const rawType = queryInput.type;
  const allowedTypes = new Set(['task', 'project']);
  const types =
    typeof rawType === 'string'
      ? rawType
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0 && allowedTypes.has(t))
      : undefined;

  const projectId = typeof queryInput.projectId === 'string' ? queryInput.projectId : undefined;
  const organizationId =
    typeof queryInput.organizationId === 'string' ? queryInput.organizationId : undefined;

  const rawLimit = queryInput.limit;
  let limit: number | undefined;
  if (typeof rawLimit === 'number' && Number.isFinite(rawLimit)) {
    limit = Math.min(100, Math.max(1, Math.floor(rawLimit)));
  } else if (typeof rawLimit === 'string' && rawLimit.trim().length > 0) {
    const parsed = Number.parseInt(rawLimit, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = Math.min(100, parsed);
    }
  }

  const results = await globalSearch({
    query: q,
    types,
    projectId,
    organizationId,
    userId: request.authUser.userId,
    limit,
  });

  return reply.status(200).send(success(results));
}
