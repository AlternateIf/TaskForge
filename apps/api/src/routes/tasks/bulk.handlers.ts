import type { BulkActionInput, UndoInput } from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { executeBulkAction } from '../../services/bulk.service.js';
import { executeUndo } from '../../services/undo.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

export async function bulkActionHandler(
  request: FastifyRequest<{ Body: BulkActionInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const result = await executeBulkAction(request.body, userId);
  return reply.status(200).send({
    data: {
      succeeded: result.succeeded,
      failed: result.failed,
    },
    meta: {
      total: result.total,
      succeeded: result.succeeded.length,
      failed: result.failed.length,
    },
  });
}

export async function undoHandler(
  request: FastifyRequest<{ Body: UndoInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  await executeUndo(request.body.undoToken, userId);
  return reply.status(204).send();
}
