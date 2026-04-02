import type { FastifyReply, FastifyRequest } from 'fastify';
import * as rbacService from '../../services/rbac.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';
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

// Roles
export async function listGlobalRolesHandler(_request: FastifyRequest, reply: FastifyReply) {
  return reply.status(200).send(success(await rbacService.listRoles(undefined)));
}

export async function createGlobalRoleHandler(
  request: FastifyRequest<{ Body: CreateRoleBody }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  const role = await rbacService.createRole(actorId, { ...request.body, organizationId: null });
  return reply.status(201).send(success(role));
}

export async function updateGlobalRoleHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateRoleBody }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  const role = await rbacService.updateRole(actorId, request.params.id, request.body);
  return reply.status(200).send(success(role));
}

export async function deleteGlobalRoleHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  await rbacService.deleteRole(actorId, request.params.id);
  return reply.status(204).send();
}

export async function listOrgRolesHandler(
  request: FastifyRequest<{ Params: { orgId: string } }>,
  reply: FastifyReply,
) {
  return reply.status(200).send(success(await rbacService.listRoles(request.params.orgId)));
}

export async function createOrgRoleHandler(
  request: FastifyRequest<{ Params: { orgId: string }; Body: CreateRoleBody }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  const role = await rbacService.createRole(actorId, {
    ...request.body,
    organizationId: request.params.orgId,
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

// Role assignments
export async function listGlobalRoleAssignmentsHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  return reply.status(200).send(success(await rbacService.listRoleAssignments(undefined)));
}

export async function createGlobalRoleAssignmentHandler(
  request: FastifyRequest<{ Body: CreateRoleAssignmentBody }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  const assignment = await rbacService.createRoleAssignment(actorId, {
    ...request.body,
    organizationId: null,
  });
  return reply.status(201).send(success(assignment));
}

export async function updateGlobalRoleAssignmentHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateRoleAssignmentBody }>,
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

export async function deleteGlobalRoleAssignmentHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  await rbacService.deleteRoleAssignment(actorId, request.params.id);
  return reply.status(204).send();
}

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

// Direct permission assignments
export async function listGlobalPermissionAssignmentsHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  return reply.status(200).send(success(await rbacService.listPermissionAssignments(undefined)));
}

export async function createGlobalPermissionAssignmentHandler(
  request: FastifyRequest<{ Body: CreatePermissionAssignmentBody }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  const assignment = await rbacService.createPermissionAssignment(actorId, {
    ...request.body,
    organizationId: null,
  });
  return reply.status(201).send(success(assignment));
}

export async function deleteGlobalPermissionAssignmentHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const actorId = requireActorId(request);
  await rbacService.deletePermissionAssignment(actorId, request.params.id);
  return reply.status(204).send();
}

export async function listOrgPermissionAssignmentsHandler(
  request: FastifyRequest<{ Params: { orgId: string } }>,
  reply: FastifyReply,
) {
  return reply
    .status(200)
    .send(success(await rbacService.listPermissionAssignments(request.params.orgId)));
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
  await rbacService.deletePermissionAssignment(actorId, request.params.id);
  return reply.status(204).send();
}
