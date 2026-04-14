import fs from 'node:fs';
import { db, organizationMembers } from '@taskforge/db';
import type {
  CreateOrganizationInput,
  UpdateMemberRoleInput,
  UpdateOrganizationInput,
} from '@taskforge/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type { FastifyReply } from 'fastify';
import * as orgService from '../../services/organization.service.js';
import { getPermissionMatrix } from '../../services/permission-matrix.service.js';
import { getEffectivePermissions } from '../../services/permission.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { paginated, success } from '../../utils/response.js';

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
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: {
      page?: string | number;
      limit?: string | number;
    };
  }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
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
    const members = await orgService.listMembers(request.params.id, userId);
    return reply.status(200).send(success(members));
  }

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 20;
  const result = await orgService.listMembersPaged(request.params.id, userId, { page, limit });
  const hasMore = page * limit < result.totalCount;
  return reply.status(200).send(paginated(result.items, null, hasMore, result.totalCount));
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

export async function getEffectivePermissionsHandler(
  request: FastifyRequest<{ Params: { id: string; userId: string } }>,
  reply: FastifyReply,
) {
  const orgId = request.params.id;
  const targetUserId = request.params.userId;

  // Verify that the target user is actually a member of the organization
  const membership = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, targetUserId),
      ),
    )
    .limit(1);

  if (membership.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User is not a member of this organization');
  }

  const result = await getEffectivePermissions(targetUserId, orgId);
  return reply.status(200).send(success(result));
}

export async function getPermissionMatrixHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const orgId = request.params.id;
  const result = await getPermissionMatrix(orgId);
  return reply.status(200).send(success(result));
}

export async function uploadOrganizationLogoHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const data = await request.file();

  if (!data) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'No file uploaded');
  }

  const fileBuffer = await data.toBuffer();
  if (data.file.truncated) {
    throw new AppError(413, ErrorCode.FILE_TOO_LARGE, 'File exceeds the 5 MB limit');
  }

  const org = await orgService.uploadOrganizationLogo(
    request.params.id,
    userId,
    fileBuffer,
    data.mimetype,
  );
  return reply.status(200).send(success(org));
}

export async function getOrganizationLogoHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const result = await orgService.getOrganizationLogoFilePath(request.params.id);
  if (!result) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Organization logo not found');
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.promises.readFile(result.filePath);
  } catch {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Organization logo file not found');
  }

  return reply
    .header('Content-Type', result.mimeType)
    .header('Cache-Control', 'public, max-age=3600')
    .send(fileBuffer);
}
