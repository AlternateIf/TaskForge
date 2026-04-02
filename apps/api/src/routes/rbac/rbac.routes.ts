import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import { hasGlobalPermission } from '../../services/permission.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import {
  createGlobalPermissionAssignmentHandler,
  createGlobalRoleAssignmentHandler,
  createGlobalRoleHandler,
  createOrgPermissionAssignmentHandler,
  createOrgRoleAssignmentHandler,
  createOrgRoleHandler,
  deleteGlobalPermissionAssignmentHandler,
  deleteGlobalRoleAssignmentHandler,
  deleteGlobalRoleHandler,
  deleteOrgPermissionAssignmentHandler,
  deleteOrgRoleAssignmentHandler,
  deleteOrgRoleHandler,
  listGlobalPermissionAssignmentsHandler,
  listGlobalRoleAssignmentsHandler,
  listGlobalRolesHandler,
  listOrgPermissionAssignmentsHandler,
  listOrgRoleAssignmentsHandler,
  listOrgRolesHandler,
  updateGlobalRoleAssignmentHandler,
  updateGlobalRoleHandler,
  updateOrgRoleAssignmentHandler,
  updateOrgRoleHandler,
} from './rbac.handlers.js';
import {
  type CreatePermissionAssignmentBody,
  type CreateRoleAssignmentBody,
  type CreateRoleBody,
  type UpdateRoleAssignmentBody,
  type UpdateRoleBody,
  createPermissionAssignmentSchema,
  createRoleAssignmentSchema,
  createRoleSchema,
  updateRoleAssignmentSchema,
  updateRoleSchema,
} from './rbac.schemas.js';

function requireGlobal(action: 'read' | 'create' | 'update' | 'delete') {
  return async (request: { authUser?: { userId: string } }) => {
    if (!request.authUser) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
    }
    const allowed = await hasGlobalPermission(
      request.authUser.userId,
      'global_role_assignment',
      action,
    );
    if (!allowed) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    }
  };
}

export async function rbacRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // Global roles
  fastify.get(
    '/api/v1/global-roles',
    { preHandler: requireGlobal('read') },
    listGlobalRolesHandler,
  );
  fastify.post<{ Body: CreateRoleBody }>(
    '/api/v1/global-roles',
    {
      preHandler: [
        requireGlobal('create'),
        async (request) => {
          request.body = createRoleSchema.parse(request.body);
        },
      ],
    },
    createGlobalRoleHandler,
  );
  fastify.patch<{ Params: { id: string }; Body: UpdateRoleBody }>(
    '/api/v1/global-roles/:id',
    {
      preHandler: [
        requireGlobal('update'),
        async (request) => {
          request.body = updateRoleSchema.parse(request.body);
        },
      ],
    },
    updateGlobalRoleHandler,
  );
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/global-roles/:id',
    { preHandler: requireGlobal('delete') },
    deleteGlobalRoleHandler,
  );

  // Org roles
  fastify.get<{ Params: { orgId: string } }>(
    '/api/v1/organizations/:orgId/roles',
    { preHandler: authorize({ resource: 'role', action: 'read' }) },
    listOrgRolesHandler,
  );
  fastify.post<{ Params: { orgId: string }; Body: CreateRoleBody }>(
    '/api/v1/organizations/:orgId/roles',
    {
      preHandler: [
        authorize({ resource: 'role', action: 'create' }),
        async (request) => {
          request.body = createRoleSchema.parse(request.body);
        },
      ],
    },
    createOrgRoleHandler,
  );
  fastify.patch<{ Params: { orgId: string; id: string }; Body: UpdateRoleBody }>(
    '/api/v1/organizations/:orgId/roles/:id',
    {
      preHandler: [
        authorize({ resource: 'role', action: 'update' }),
        async (request) => {
          request.body = updateRoleSchema.parse(request.body);
        },
      ],
    },
    updateOrgRoleHandler,
  );
  fastify.delete<{ Params: { orgId: string; id: string } }>(
    '/api/v1/organizations/:orgId/roles/:id',
    { preHandler: authorize({ resource: 'role', action: 'delete' }) },
    deleteOrgRoleHandler,
  );

  // Global role assignments
  fastify.get(
    '/api/v1/global-role-assignments',
    { preHandler: requireGlobal('read') },
    listGlobalRoleAssignmentsHandler,
  );
  fastify.post<{ Body: CreateRoleAssignmentBody }>(
    '/api/v1/global-role-assignments',
    {
      preHandler: [
        requireGlobal('create'),
        async (request) => {
          request.body = createRoleAssignmentSchema.parse(request.body);
        },
      ],
    },
    createGlobalRoleAssignmentHandler,
  );
  fastify.patch<{ Params: { id: string }; Body: UpdateRoleAssignmentBody }>(
    '/api/v1/global-role-assignments/:id',
    {
      preHandler: [
        requireGlobal('update'),
        async (request) => {
          request.body = updateRoleAssignmentSchema.parse(request.body);
        },
      ],
    },
    updateGlobalRoleAssignmentHandler,
  );
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/global-role-assignments/:id',
    { preHandler: requireGlobal('delete') },
    deleteGlobalRoleAssignmentHandler,
  );

  // Org role assignments
  fastify.get<{ Params: { orgId: string } }>(
    '/api/v1/organizations/:orgId/role-assignments',
    { preHandler: authorize({ resource: 'role', action: 'read' }) },
    listOrgRoleAssignmentsHandler,
  );
  fastify.post<{ Params: { orgId: string }; Body: CreateRoleAssignmentBody }>(
    '/api/v1/organizations/:orgId/role-assignments',
    {
      preHandler: [
        authorize({ resource: 'role', action: 'update' }),
        async (request) => {
          request.body = createRoleAssignmentSchema.parse(request.body);
        },
      ],
    },
    createOrgRoleAssignmentHandler,
  );
  fastify.patch<{ Params: { orgId: string; id: string }; Body: UpdateRoleAssignmentBody }>(
    '/api/v1/organizations/:orgId/role-assignments/:id',
    {
      preHandler: [
        authorize({ resource: 'role', action: 'update' }),
        async (request) => {
          request.body = updateRoleAssignmentSchema.parse(request.body);
        },
      ],
    },
    updateOrgRoleAssignmentHandler,
  );
  fastify.delete<{ Params: { orgId: string; id: string } }>(
    '/api/v1/organizations/:orgId/role-assignments/:id',
    { preHandler: authorize({ resource: 'role', action: 'delete' }) },
    deleteOrgRoleAssignmentHandler,
  );

  // Global direct permission assignments
  fastify.get(
    '/api/v1/global-permission-assignments',
    { preHandler: requireGlobal('read') },
    listGlobalPermissionAssignmentsHandler,
  );
  fastify.post<{ Body: CreatePermissionAssignmentBody }>(
    '/api/v1/global-permission-assignments',
    {
      preHandler: [
        requireGlobal('create'),
        async (request) => {
          request.body = createPermissionAssignmentSchema.parse(request.body);
        },
      ],
    },
    createGlobalPermissionAssignmentHandler,
  );
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/global-permission-assignments/:id',
    { preHandler: requireGlobal('delete') },
    deleteGlobalPermissionAssignmentHandler,
  );

  // Org direct permission assignments
  fastify.get<{ Params: { orgId: string } }>(
    '/api/v1/organizations/:orgId/permission-assignments',
    { preHandler: authorize({ resource: 'permission', action: 'read' }) },
    listOrgPermissionAssignmentsHandler,
  );
  fastify.post<{ Params: { orgId: string }; Body: CreatePermissionAssignmentBody }>(
    '/api/v1/organizations/:orgId/permission-assignments',
    {
      preHandler: [
        authorize({ resource: 'permission', action: 'update' }),
        async (request) => {
          request.body = createPermissionAssignmentSchema.parse(request.body);
        },
      ],
    },
    createOrgPermissionAssignmentHandler,
  );
  fastify.delete<{ Params: { orgId: string; id: string } }>(
    '/api/v1/organizations/:orgId/permission-assignments/:id',
    { preHandler: authorize({ resource: 'permission', action: 'update' }) },
    deleteOrgPermissionAssignmentHandler,
  );
}
