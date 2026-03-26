import type { FastifyReply, FastifyRequest } from 'fastify';
import { type FeatureKey, isFeatureEnabled } from '../services/feature-toggle.service.js';
import { AppError, ErrorCode } from '../utils/errors.js';

/**
 * Returns a Fastify preHandler that checks if a feature is enabled for the
 * organization. Must be used AFTER `authorize` (which sets permissionContext
 * with the resolved orgId).
 *
 * If the feature is disabled, responds with 403.
 */
export function requireFeature(feature: FeatureKey) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const orgId = request.permissionContext?.orgId;
    if (!orgId) {
      // If permissionContext is not set, authorize hasn't run or the user isn't in an org.
      // Fall through — let other hooks handle auth.
      return;
    }

    const enabled = await isFeatureEnabled(orgId, feature);
    if (!enabled) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        `Feature "${feature}" is disabled for this organization`,
      );
    }
  };
}
