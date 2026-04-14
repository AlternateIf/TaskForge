import type { FastifyReply, FastifyRequest } from 'fastify';
import * as rbacService from '../../services/rbac.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { paginated, success } from '../../utils/response.js';
import type {
  CreatePermissionAssignmentBody,
  CreateRoleAssignmentBody,
  CreateRoleBody,
  UpdateRoleAssignmentBody,
  UpdateRoleBody,
} from './rbac.schemas.js';

function requireActorId(request: FastifyRequest): string {
  if (!request.authUser) throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  return request.authUser.userId;
}

// Org roles
export async function listOrgRolesHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
    Querystring: {
      page?: string | number;
      limit?: string | number;
    };
  }>,
  reply: FastifyReply,
) {
  const userId = requireActorId(request);
  const query = request.query as {
    page?: string | number;
    limit?: string | number;
  };
  const rawPage =
    typeof query.page === 'number' ? query.page : Number.parseInt(`${query.page}`, 10);
  const rawLimit =
    typeof query.limit === 'number' ? query.limit : Number.parseInt(`${query.limit}`, 10);
  const hasPagination = Number.isFinite(rawPage) || Number.isFinite(rawLimit);

  if (!hasPagination) {
    return reply
      .status(200)
      .send(success(await rbacService.listRoles(request.params.orgId, userId)));
  }

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 20;
  const result = await rbacService.listRolesPaged(request.params.orgId, { page, limit }, userId);
  const hasMore = page * limit < result.totalCount;
  return reply.status(200).send(paginated(result.items, null, hasMore, result.totalCount));
}

export async function createOrgRoleHandler(
  request: FastifyRequest<{ Params: { orgId: string }; Body: CreateRoleBody }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  const role = await rbacService.createRole(actorId, {
    name: request.body.name,
    description: request.body.description ?? null,
    organizationId: request.params.orgId,
    permissions: request.body.permissions,
  });
  return reply.status(201).send(success(role));
}

export async function updateOrgRoleHandler(
  request: FastifyRequest<{ Params: { orgId: string; id: string }; Body: UpdateRoleBody }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  const role = await rbacService.updateRole(actorId, request.params.id, request.body);
  return reply.status(200).send(success(role));
}

export async function deleteOrgRoleHandler(
  request: FastifyRequest<{ Params: { orgId: string; id: string } }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  await rbacService.deleteRole(actorId, request.params.id);
  return reply.status(204).send();
}

// Org role assignments
export async function listOrgRoleAssignmentsHandler(
  request: FastifyRequest<{ Params: { orgId: string } }>,
  reply: FastifyReply,
) {
  return reply
    .status(200)
    .send(success(await rbacService.listRoleAssignments(request.params.orgId)));
}

export async function createOrgRoleAssignmentHandler(
  request: FastifyRequest<{ Params: { orgId: string }; Body: CreateRoleAssignmentBody }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  const assignment = await rbacService.createRoleAssignment(actorId, {
    ...request.body,
    organizationId: request.params.orgId,
  });
  return reply.status(201).send(success(assignment));
}

export async function updateOrgRoleAssignmentHandler(
  request: FastifyRequest<{
    Params: { orgId: string; id: string };
    Body: UpdateRoleAssignmentBody;
  }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  const assignment = await rbacService.updateRoleAssignment(
    actorId,
    request.params.id,
    request.body,
  );
  return reply.status(200).send(success(assignment));
}

export async function deleteOrgRoleAssignmentHandler(
  request: FastifyRequest<{ Params: { orgId: string; id: string } }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  await rbacService.deleteRoleAssignment(actorId, request.params.id);
  return reply.status(204).send();
}

// Org direct permission assignments
export async function listOrgPermissionAssignmentsHandler(
  request: FastifyRequest<{ Params: { orgId: string } }>,
  reply: FastifyReply,
) {
  const userId = requireActorId(request);
  return reply
    .status(200)
    .send(success(await rbacService.listPermissionAssignments(request.params.orgId, userId)));
}

export async function createOrgPermissionAssignmentHandler(
  request: FastifyRequest<{ Params: { orgId: string }; Body: CreatePermissionAssignmentBody }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  const assignment = await rbacService.createPermissionAssignment(actorId, {
    ...request.body,
    organizationId: request.params.orgId,
  });
  return reply.status(201).send(success(assignment));
}

export async function deleteOrgPermissionAssignmentHandler(
  request: FastifyRequest<{ Params: { orgId: string; id: string } }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  await rbacService.deletePermissionAssignment(actorId, request.params.id, request.params.orgId);
  return reply.status(204).send();
}
