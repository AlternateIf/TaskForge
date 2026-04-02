import type {
  CreateOrganizationInput,
  UpdateMemberRoleInput,
  UpdateOrganizationInput,
} from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as orgService from '../../services/organization.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

export async function createOrganizationHandler(
  request: FastifyRequest<{ Body: CreateOrganizationInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const result = await orgService.createOrganization(request.body.name, userId);
  return reply.status(201).send(success(result));
}

export async function listOrganizationsHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = requireAuth(request);
  const orgs = await orgService.listUserOrganizations(userId);
  return reply.status(200).send(success(orgs));
}

export async function getOrganizationHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const org = await orgService.getOrganization(request.params.id, userId);
  return reply.status(200).send(success(org));
}

export async function updateOrganizationHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateOrganizationInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const org = await orgService.updateOrganization(request.params.id, userId, request.body);
  return reply.status(200).send(success(org));
}

export async function deleteOrganizationHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  await orgService.deleteOrganization(request.params.id, userId);
  return reply.status(204).send();
}

export async function listMembersHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const members = await orgService.listMembers(request.params.id, userId);
  return reply.status(200).send(success(members));
}

export async function updateMemberRoleHandler(
  request: FastifyRequest<{
    Params: { id: string; memberId: string };
    Body: UpdateMemberRoleInput;
  }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const member = await orgService.updateMemberRole(
    request.params.id,
    userId,
    request.params.memberId,
    request.body.roleId,
  );
  return reply.status(200).send(success(member));
}

export async function removeMemberHandler(
  request: FastifyRequest<{ Params: { id: string; memberId: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  await orgService.removeMember(request.params.id, userId, request.params.memberId);
  return reply.status(204).send();
}
