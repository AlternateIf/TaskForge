import {
  createOrganizationSchema,
  updateAuthSettingsSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
} from '@taskforge/shared';
import type {
  UpdateAuthSettingsInput,
  UpdateMemberRoleInput,
  UpdateOrganizationInput,
} from '@taskforge/shared';
import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import type { FeatureMap } from '../../services/feature-toggle.service.js';
import { hasGlobalPermission } from '../../services/permission.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { getAuthSettingsHandler, updateAuthSettingsHandler } from './auth-settings.handlers.js';
import { getFeaturesHandler, updateFeaturesHandler } from './features.handlers.js';
import {
  createOrganizationHandler,
  deleteOrganizationHandler,
  getOrganizationHandler,
  listMembersHandler,
  listOrganizationsHandler,
  removeMemberHandler,
  updateMemberRoleHandler,
  updateOrganizationHandler,
} from './organizations.handlers.js';

export async function organizationRoutes(fastify: FastifyInstance) {
  // All org routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // Create: any authenticated user can create an org (they become Super Admin)
  fastify.post(
    '/api/v1/organizations',
    {
      preHandler: [
        async (request) => {
          if (!request.authUser) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
          }
          const allowed = await hasGlobalPermission(
            request.authUser.userId,
            'organization',
            'create',
          );
          if (!allowed) {
            throw new AppError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
          }
        },
        async (request) => {
          request.body = createOrganizationSchema.parse(request.body);
        },
      ],
    },
    createOrganizationHandler,
  );

  // List: returns only orgs the user belongs to
  fastify.get('/api/v1/organizations', {}, listOrganizationsHandler);

  // Get: requires org read permission
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/organizations/:id',
    { preHandler: authorize({ resource: 'organization', action: 'read' }) },
    getOrganizationHandler,
  );

  // Update: requires org update permission (Admin+)
  fastify.patch<{ Params: { id: string }; Body: UpdateOrganizationInput }>(
    '/api/v1/organizations/:id',
    {
      preHandler: [
        authorize({ resource: 'organization', action: 'update' }),
        async (request) => {
          request.body = updateOrganizationSchema.parse(request.body);
        },
      ],
    },
    updateOrganizationHandler,
  );

  // Delete: requires org delete (Super Admin only)
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/organizations/:id',
    { preHandler: authorize({ resource: 'organization', action: 'delete' }) },
    deleteOrganizationHandler,
  );

  // Members
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/organizations/:id/members',
    { preHandler: authorize({ resource: 'organization', action: 'read' }) },
    listMembersHandler,
  );

  fastify.patch<{ Params: { id: string; memberId: string }; Body: UpdateMemberRoleInput }>(
    '/api/v1/organizations/:id/members/:memberId',
    {
      preHandler: [
        authorize({ resource: 'organization', action: 'update' }),
        async (request) => {
          request.body = updateMemberRoleSchema.parse(request.body);
        },
      ],
    },
    updateMemberRoleHandler,
  );

  fastify.delete<{ Params: { id: string; memberId: string } }>(
    '/api/v1/organizations/:id/members/:memberId',
    { preHandler: authorize({ resource: 'organization', action: 'update' }) },
    removeMemberHandler,
  );

  // Feature toggles
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/organizations/:id/features',
    { preHandler: authorize({ resource: 'organization', action: 'read' }) },
    getFeaturesHandler,
  );

  fastify.patch<{ Params: { id: string }; Body: Partial<FeatureMap> }>(
    '/api/v1/organizations/:id/features',
    { preHandler: authorize({ resource: 'organization', action: 'update' }) },
    updateFeaturesHandler,
  );

  // Auth settings
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/organizations/:id/auth-settings',
    { preHandler: authorize({ resource: 'organization', action: 'read' }) },
    getAuthSettingsHandler,
  );

  fastify.patch<{ Params: { id: string }; Body: UpdateAuthSettingsInput }>(
    '/api/v1/organizations/:id/auth-settings',
    {
      preHandler: [
        authorize({ resource: 'organization', action: 'update' }),
        async (request) => {
          request.body = updateAuthSettingsSchema.parse(request.body);
        },
      ],
    },
    updateAuthSettingsHandler,
  );
}
