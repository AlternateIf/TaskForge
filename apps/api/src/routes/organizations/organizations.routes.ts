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
import { getOrgCreatePermission } from '../../services/permission.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { getAuthSettingsHandler, updateAuthSettingsHandler } from './auth-settings.handlers.js';
import { getFeaturesHandler, updateFeaturesHandler } from './features.handlers.js';
import {
  createOrganizationHandler,
  deleteOrganizationHandler,
  getEffectivePermissionsHandler,
  getOrganizationHandler,
  getOrganizationLogoHandler,
  getPermissionMatrixHandler,
  listMembersHandler,
  listOrganizationsHandler,
  removeMemberHandler,
  updateMemberRoleHandler,
  updateOrganizationHandler,
  uploadOrganizationLogoHandler,
} from './organizations.handlers.js';

export async function organizationRoutes(fastify: FastifyInstance) {
  // All org routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // Create: any authenticated user with organization.create.org permission can create an org.
  // If the user has no existing org memberships (first org), creation is allowed.
  fastify.post(
    '/api/v1/organizations',
    {
      preHandler: [
        async (request) => {
          if (!request.authUser) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
          }
          const allowed = await getOrgCreatePermission(request.authUser.userId);
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

  // List: returns only orgs the user belongs to and has organization.read.org permission for.
  // Route-level authorization: reject users who lack organization.read in every org they belong to.
  // Service-layer filtering (listUserOrganizations) remains as defense-in-depth.
  fastify.get(
    '/api/v1/organizations',
    {
      preHandler: [
        async (request) => {
          if (!request.authUser) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
          }
          // Users without any org memberships will get an empty list.
          // No global permission check — org listing is strictly membership-based.
        },
      ],
    },
    listOrganizationsHandler,
  );

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

  fastify.post<{ Params: { id: string } }>(
    '/api/v1/organizations/:id/logo',
    { preHandler: authorize({ resource: 'organization', action: 'update' }) },
    uploadOrganizationLogoHandler,
  );

  // Delete: requires org delete permission
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/organizations/:id',
    { preHandler: authorize({ resource: 'organization', action: 'delete' }) },
    deleteOrganizationHandler,
  );

  // Members
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/organizations/:id/members',
    { preHandler: authorize({ resource: 'membership', action: 'read' }) },
    listMembersHandler,
  );

  fastify.patch<{ Params: { id: string; memberId: string }; Body: UpdateMemberRoleInput }>(
    '/api/v1/organizations/:id/members/:memberId',
    {
      preHandler: [
        authorize({ resource: 'membership', action: 'update' }),
        async (request) => {
          request.body = updateMemberRoleSchema.parse(request.body);
        },
      ],
    },
    updateMemberRoleHandler,
  );

  fastify.delete<{ Params: { id: string; memberId: string } }>(
    '/api/v1/organizations/:id/members/:memberId',
    { preHandler: authorize({ resource: 'membership', action: 'delete' }) },
    removeMemberHandler,
  );

  // Effective permissions for a member - requires organization.update (not just read)
  // to prevent non-admins from enumerating other users' permissions
  fastify.get<{ Params: { id: string; userId: string } }>(
    '/api/v1/organizations/:id/members/:userId/effective-permissions',
    { preHandler: authorize({ resource: 'organization', action: 'update' }) },
    getEffectivePermissionsHandler,
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

  // Permission matrix — requires role.read permission
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/organizations/:id/permission-matrix',
    { preHandler: authorize({ resource: 'role', action: 'read' }) },
    getPermissionMatrixHandler,
  );
}

export async function organizationPublicRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/organizations/logos/:id',
    {},
    getOrganizationLogoHandler,
  );
}
