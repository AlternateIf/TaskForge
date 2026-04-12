import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import {
  createOrgPermissionAssignmentHandler,
  createOrgRoleAssignmentHandler,
  createOrgRoleHandler,
  deleteOrgPermissionAssignmentHandler,
  deleteOrgRoleAssignmentHandler,
  deleteOrgRoleHandler,
  listOrgPermissionAssignmentsHandler,
  listOrgRoleAssignmentsHandler,
  listOrgRolesHandler,
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

export async function rbacRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

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
