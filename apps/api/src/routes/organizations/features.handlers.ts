import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FeatureMap } from '../../services/feature-toggle.service.js';
import { getFeatures, updateFeatures } from '../../services/feature-toggle.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

export async function getFeaturesHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const features = await getFeatures(request.params.id, userId);
  return reply.status(200).send(success(features));
}

export async function updateFeaturesHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: Partial<FeatureMap> }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const features = await updateFeatures(request.params.id, userId, request.body);
  return reply.status(200).send(success(features));
}
