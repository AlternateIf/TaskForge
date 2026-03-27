import type { UpdateAuthSettingsInput } from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as authSettingsService from '../../services/org-auth-settings.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

export async function getAuthSettingsHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const settings = await authSettingsService.getAuthSettings(request.params.id);
  return reply.status(200).send(success(settings));
}

export async function updateAuthSettingsHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateAuthSettingsInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const settings = await authSettingsService.updateAuthSettings(
    request.params.id,
    userId,
    request.body,
  );
  return reply.status(200).send(success(settings));
}
