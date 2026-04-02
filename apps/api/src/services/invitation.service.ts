import crypto from 'node:crypto';
import {
  db,
  invitationTargetPermissions,
  invitationTargetRoles,
  invitationTargets,
  invitations,
  oauthAccounts,
  organizationAuthSettings,
  organizationMembers,
  organizations,
  permissionAssignments,
  roleAssignments,
  roles,
  users,
} from '@taskforge/db';
import { GOVERNANCE_PERMISSION_SET } from '@taskforge/shared';
import bcrypt from 'bcrypt';
import { and, eq, inArray, isNull, lt } from 'drizzle-orm';
import { publish } from '../queues/publisher.js';
import { AppError, ErrorCode } from '../utils/errors.js';
import * as activityService from './activity.service.js';
import { createSession } from './auth.service.js';
import type { JwtPayload, TokenPair } from './auth.service.js';

const INVITATION_EXPIRY_HOURS = 72;
const BCRYPT_ROUNDS = 12;
type DbExecutor = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>;
type ReadExecutor = Pick<typeof db, 'select'>;

export interface InvitationTargetInput {
  organizationId: string;
  roleIds?: string[];
  permissionKeys?: string[];
}

export interface CreateInvitationInput {
  email: string;
  targets: InvitationTargetInput[];
  allowedAuthMethods?: string[];
}

export interface InvitationOutput {
  id: string;
  email: string;
  status: 'sent' | 'accepted' | 'revoked' | 'expired';
  sentAt: string;
  expiresAt: string;
  allowedAuthMethods: string[];
}

export interface InvitationTokenInfo {
  invitationId: string;
  email: string;
  allowedAuthMethods: string[];
  targets: Array<{ organizationId: string; organizationName: string }>;
  status: 'sent' | 'expired' | 'revoked' | 'accepted';
}

interface OAuthInviteIdentity {
  provider: string;
  providerUserId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

interface InvitationApplySummary {
  addedMembershipOrgIds: string[];
  addedRoleAssignments: Array<{ organizationId: string; roleId: string }>;
  addedPermissionAssignments: Array<{ organizationId: string; permissionKey: string }>;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || trimmed.startsWith('"')) {
      try {
        return normalizeStringArray(JSON.parse(trimmed));
      } catch {
        // Fall back to comma-separated parsing below.
      }
    }

    return trimmed
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
}

function normalizeOptionalStringArray(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;
  return normalizeStringArray(value);
}

function getEnvEnabledOAuthProviders(): string[] {
  const providers: string[] = [];
  if (process.env.OAUTH_GOOGLE_CLIENT_ID) providers.push('google');
  if (process.env.OAUTH_GITHUB_CLIENT_ID) providers.push('github');

  for (let i = 1; i <= 9; i++) {
    const id = process.env[`OAUTH_CUSTOM_${i}_ID`];
    const clientId = process.env[`OAUTH_CUSTOM_${i}_CLIENT_ID`];
    const clientSecret = process.env[`OAUTH_CUSTOM_${i}_CLIENT_SECRET`];
    if (id && clientId && clientSecret) {
      providers.push(id);
    }
  }

  return providers;
}

function computeExpiry(sentAt: Date): Date {
  return new Date(sentAt.getTime() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);
}

function resolveStatus(
  invite: typeof invitations.$inferSelect,
): 'sent' | 'accepted' | 'revoked' | 'expired' {
  if (invite.status === 'accepted') return 'accepted';
  if (invite.status === 'revoked') return 'revoked';
  if (invite.expiresAt <= new Date()) return 'expired';
  return 'sent';
}

function assertInvitableStatusOrThrow(
  invite: typeof invitations.$inferSelect,
  invalidMessage = 'This invitation is no longer valid',
): void {
  const status = resolveStatus(invite);
  if (status === 'sent') return;
  if (status === 'accepted') {
    throw new AppError(409, ErrorCode.CONFLICT, 'Invitation already consumed');
  }
  throw new AppError(410, ErrorCode.GONE, invalidMessage);
}

async function getTargetRows(invitationId: string) {
  return db
    .select({
      targetId: invitationTargets.id,
      organizationId: invitationTargets.organizationId,
      organizationName: organizations.name,
    })
    .from(invitationTargets)
    .innerJoin(organizations, eq(organizations.id, invitationTargets.organizationId))
    .where(eq(invitationTargets.invitationId, invitationId));
}

async function computeAllowedAuthMethods(
  organizationIds: string[],
  selectedSubset?: unknown,
  executor: ReadExecutor = db,
): Promise<string[]> {
  const methods = new Set<string>(['password', ...getEnvEnabledOAuthProviders()]);

  if (organizationIds.length > 0) {
    const authSettings = await executor
      .select({
        organizationId: organizationAuthSettings.organizationId,
        passwordAuthEnabled: organizationAuthSettings.passwordAuthEnabled,
        googleOauthEnabled: organizationAuthSettings.googleOauthEnabled,
        githubOauthEnabled: organizationAuthSettings.githubOauthEnabled,
      })
      .from(organizationAuthSettings)
      .where(inArray(organizationAuthSettings.organizationId, organizationIds));

    for (const row of authSettings) {
      if (!row.passwordAuthEnabled) methods.delete('password');
      if (!row.googleOauthEnabled) methods.delete('google');
      if (!row.githubOauthEnabled) methods.delete('github');
    }
  }

  const subset = normalizeOptionalStringArray(selectedSubset);
  const filtered = subset ? [...methods].filter((method) => subset.includes(method)) : [...methods];

  return filtered.sort();
}

async function getInvitationTargetOrganizationIds(
  invitationId: string,
  executor: ReadExecutor = db,
): Promise<string[]> {
  const rows = await executor
    .select({ organizationId: invitationTargets.organizationId })
    .from(invitationTargets)
    .where(eq(invitationTargets.invitationId, invitationId));
  return rows.map((row) => row.organizationId);
}

async function cleanupInvitationPayload(
  invitationId: string,
  executor: DbExecutor = db,
): Promise<void> {
  const targets = await executor
    .select({ id: invitationTargets.id })
    .from(invitationTargets)
    .where(eq(invitationTargets.invitationId, invitationId));

  if (targets.length === 0) return;
  const targetIds = targets.map((target) => target.id);

  await executor
    .delete(invitationTargetRoles)
    .where(inArray(invitationTargetRoles.invitationTargetId, targetIds));
  await executor
    .delete(invitationTargetPermissions)
    .where(inArray(invitationTargetPermissions.invitationTargetId, targetIds));
  await executor.delete(invitationTargets).where(eq(invitationTargets.invitationId, invitationId));
}

export async function cleanupExpiredInvitations(): Promise<void> {
  const expired = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(and(eq(invitations.status, 'sent'), lt(invitations.expiresAt, new Date())));

  for (const invite of expired) {
    await cleanupInvitationPayload(invite.id);
    await db.delete(invitations).where(eq(invitations.id, invite.id));
  }
}

async function sendInvitationEmail(to: string, token: string): Promise<void> {
  await publish('email.send', {
    to,
    subject: 'You have been invited to TaskForge',
    templateName: 'invitation',
    templateData: {
      inviteLink: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/auth/invite/${token}`,
    },
  });
}

async function sendInvitationRevokedEmail(to: string): Promise<void> {
  await publish('email.send', {
    to,
    subject: 'Your TaskForge invitation was revoked',
    templateName: 'invitation_revoked',
    templateData: {},
  });
}

function mergeAllowedAuthMethods(existing: unknown, incoming: string[]): string[] {
  return [...new Set([...normalizeStringArray(existing), ...incoming])].sort();
}

async function upsertInvitationTargetSnapshot(
  tx: DbExecutor,
  invitationId: string,
  target: InvitationTargetInput,
  now: Date,
): Promise<void> {
  const existingTarget = (
    await tx
      .select({ id: invitationTargets.id })
      .from(invitationTargets)
      .where(
        and(
          eq(invitationTargets.invitationId, invitationId),
          eq(invitationTargets.organizationId, target.organizationId),
        ),
      )
      .limit(1)
  )[0];

  const targetId = existingTarget?.id ?? crypto.randomUUID();
  if (!existingTarget) {
    await tx.insert(invitationTargets).values({
      id: targetId,
      invitationId,
      organizationId: target.organizationId,
      createdAt: now,
    });
  }

  const existingRoleIds = new Set(
    (
      await tx
        .select({ roleId: invitationTargetRoles.roleId })
        .from(invitationTargetRoles)
        .where(eq(invitationTargetRoles.invitationTargetId, targetId))
    ).map((row) => row.roleId),
  );

  for (const roleId of [...new Set(target.roleIds ?? [])]) {
    if (existingRoleIds.has(roleId)) continue;
    await tx.insert(invitationTargetRoles).values({
      id: crypto.randomUUID(),
      invitationTargetId: targetId,
      roleId,
      createdAt: now,
    });
  }

  const existingPermissionKeys = new Set(
    (
      await tx
        .select({ permissionKey: invitationTargetPermissions.permissionKey })
        .from(invitationTargetPermissions)
        .where(eq(invitationTargetPermissions.invitationTargetId, targetId))
    ).map((row) => row.permissionKey),
  );

  for (const permissionKey of [...new Set(target.permissionKeys ?? [])]) {
    if (!GOVERNANCE_PERMISSION_SET.has(permissionKey)) {
      throw new AppError(
        422,
        ErrorCode.UNPROCESSABLE_ENTITY,
        'Invalid permission key in invite payload',
      );
    }
    if (existingPermissionKeys.has(permissionKey)) continue;

    await tx.insert(invitationTargetPermissions).values({
      id: crypto.randomUUID(),
      invitationTargetId: targetId,
      permissionKey,
      createdAt: now,
    });
  }
}

async function ensureRoleAssignment(
  tx: DbExecutor,
  userId: string,
  roleId: string,
  organizationId: string | null,
  assignedByUserId: string,
): Promise<boolean> {
  const existing = (
    await tx
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, userId),
          eq(roleAssignments.roleId, roleId),
          organizationId === null
            ? isNull(roleAssignments.organizationId)
            : eq(roleAssignments.organizationId, organizationId),
        ),
      )
      .limit(1)
  )[0];

  if (existing) return false;

  await tx.insert(roleAssignments).values({
    id: crypto.randomUUID(),
    userId,
    roleId,
    organizationId,
    assignedByUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return true;
}

async function ensurePermissionAssignment(
  tx: DbExecutor,
  userId: string,
  permissionKey: string,
  organizationId: string | null,
  assignedByUserId: string,
): Promise<boolean> {
  const existing = (
    await tx
      .select({ id: permissionAssignments.id })
      .from(permissionAssignments)
      .where(
        and(
          eq(permissionAssignments.userId, userId),
          eq(permissionAssignments.permissionKey, permissionKey),
          organizationId === null
            ? isNull(permissionAssignments.organizationId)
            : eq(permissionAssignments.organizationId, organizationId),
        ),
      )
      .limit(1)
  )[0];

  if (existing) return false;

  await tx.insert(permissionAssignments).values({
    id: crypto.randomUUID(),
    userId,
    organizationId,
    permissionKey,
    assignedByUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return true;
}

async function applyInvitationSnapshot(
  tx: DbExecutor,
  invitationId: string,
  userId: string,
  assignedByUserId: string,
): Promise<InvitationApplySummary> {
  const summary: InvitationApplySummary = {
    addedMembershipOrgIds: [],
    addedRoleAssignments: [],
    addedPermissionAssignments: [],
  };
  const targets = await tx
    .select({
      id: invitationTargets.id,
      organizationId: invitationTargets.organizationId,
    })
    .from(invitationTargets)
    .where(eq(invitationTargets.invitationId, invitationId));

  for (const target of targets) {
    const existingMembership = (
      await tx
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, target.organizationId),
            eq(organizationMembers.userId, userId),
          ),
        )
        .limit(1)
    )[0];

    if (!existingMembership) {
      await tx.insert(organizationMembers).values({
        id: crypto.randomUUID(),
        organizationId: target.organizationId,
        userId,
        roleId: null,
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      summary.addedMembershipOrgIds.push(target.organizationId);
    }

    const targetRoles = await tx
      .select({ roleId: invitationTargetRoles.roleId })
      .from(invitationTargetRoles)
      .where(eq(invitationTargetRoles.invitationTargetId, target.id));

    for (const roleRef of targetRoles) {
      const role = (
        await tx
          .select({ id: roles.id })
          .from(roles)
          .where(and(eq(roles.id, roleRef.roleId), eq(roles.organizationId, target.organizationId)))
          .limit(1)
      )[0];

      if (!role) {
        throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'Invite references invalid role');
      }

      const inserted = await ensureRoleAssignment(
        tx,
        userId,
        role.id,
        target.organizationId,
        assignedByUserId,
      );
      if (inserted) {
        summary.addedRoleAssignments.push({
          organizationId: target.organizationId,
          roleId: role.id,
        });
      }
    }

    const targetPermissions = await tx
      .select({ permissionKey: invitationTargetPermissions.permissionKey })
      .from(invitationTargetPermissions)
      .where(eq(invitationTargetPermissions.invitationTargetId, target.id));

    for (const permission of targetPermissions) {
      if (!GOVERNANCE_PERMISSION_SET.has(permission.permissionKey)) {
        throw new AppError(
          422,
          ErrorCode.UNPROCESSABLE_ENTITY,
          'Invite references invalid permission key',
        );
      }

      const inserted = await ensurePermissionAssignment(
        tx,
        userId,
        permission.permissionKey,
        target.organizationId,
        assignedByUserId,
      );
      if (inserted) {
        summary.addedPermissionAssignments.push({
          organizationId: target.organizationId,
          permissionKey: permission.permissionKey,
        });
      }
    }
  }

  return summary;
}

async function logInvitationAcceptance(args: {
  invitationId: string;
  inviterOrgId: string;
  invitedByUserId: string;
  consumedByUserId: string;
  authMethod: string;
  applied: InvitationApplySummary;
  oauthProviderLinked?: string;
}): Promise<void> {
  await activityService.log({
    organizationId: args.inviterOrgId,
    actorId: args.invitedByUserId,
    entityType: 'invitation',
    entityId: args.invitationId,
    action: 'invitation_accepted',
    changes: {
      consumedByUserId: { before: null, after: args.consumedByUserId },
      authMethod: { before: null, after: args.authMethod },
      membershipsAdded: { before: 0, after: args.applied.addedMembershipOrgIds.length },
      roleAssignmentsAdded: { before: 0, after: args.applied.addedRoleAssignments.length },
      permissionAssignmentsAdded: {
        before: 0,
        after: args.applied.addedPermissionAssignments.length,
      },
    },
  });

  if (args.oauthProviderLinked) {
    await activityService.log({
      organizationId: args.inviterOrgId,
      actorId: args.invitedByUserId,
      entityType: 'invitation',
      entityId: args.invitationId,
      action: 'oauth_account_linked_via_invitation',
      changes: {
        provider: { before: null, after: args.oauthProviderLinked },
        userId: { before: null, after: args.consumedByUserId },
      },
    });
  }

  const uniqueMembershipOrgIds = [...new Set(args.applied.addedMembershipOrgIds)];
  for (const organizationId of uniqueMembershipOrgIds) {
    await activityService.log({
      organizationId,
      actorId: args.invitedByUserId,
      entityType: 'invitation',
      entityId: args.invitationId,
      action: 'membership_applied_from_invitation',
      changes: {
        userId: { before: null, after: args.consumedByUserId },
      },
    });
  }

  for (const assignment of args.applied.addedRoleAssignments) {
    await activityService.log({
      organizationId: assignment.organizationId,
      actorId: args.invitedByUserId,
      entityType: 'invitation',
      entityId: args.invitationId,
      action: 'role_assignment_applied_from_invitation',
      changes: {
        userId: { before: null, after: args.consumedByUserId },
        roleId: { before: null, after: assignment.roleId },
      },
    });
  }

  for (const assignment of args.applied.addedPermissionAssignments) {
    await activityService.log({
      organizationId: assignment.organizationId,
      actorId: args.invitedByUserId,
      entityType: 'invitation',
      entityId: args.invitationId,
      action: 'permission_assignment_applied_from_invitation',
      changes: {
        userId: { before: null, after: args.consumedByUserId },
        permissionKey: { before: null, after: assignment.permissionKey },
      },
    });
  }
}

export async function createInvitation(
  inviterOrgId: string,
  invitedByUserId: string,
  input: CreateInvitationInput,
): Promise<{ invitation: InvitationOutput; token: string }> {
  await cleanupExpiredInvitations();

  const normalizedEmail = normalizeEmail(input.email);

  if (input.targets.length === 0) {
    throw new AppError(
      422,
      ErrorCode.UNPROCESSABLE_ENTITY,
      'At least one target organization is required',
    );
  }

  const targetOrgIds = [...new Set(input.targets.map((target) => target.organizationId))];
  const allowedAuthMethods = await computeAllowedAuthMethods(
    targetOrgIds,
    input.allowedAuthMethods,
  );

  if (allowedAuthMethods.length === 0) {
    throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'No allowed authentication methods');
  }

  const now = new Date();
  const activeInvites = (
    await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.inviterOrgId, inviterOrgId),
          eq(invitations.email, normalizedEmail),
          eq(invitations.status, 'sent'),
        ),
      )
  )
    .filter((invite) => invite.expiresAt > now)
    .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());

  const token = generateRawToken();
  const tokenHash = hashToken(token);
  const sentAt = now;
  const expiresAt = computeExpiry(sentAt);

  const existingInvite = activeInvites[0];
  const staleInviteIds = activeInvites.slice(1).map((invite) => invite.id);

  const invitationId = existingInvite?.id ?? crypto.randomUUID();
  const finalAllowedAuthMethods = existingInvite
    ? mergeAllowedAuthMethods(existingInvite.allowedAuthMethods, allowedAuthMethods)
    : allowedAuthMethods;

  await db.transaction(async (tx) => {
    if (staleInviteIds.length > 0) {
      await tx
        .update(invitations)
        .set({
          status: 'revoked',
          revokedAt: now,
          updatedAt: now,
        })
        .where(inArray(invitations.id, staleInviteIds));

      for (const staleInviteId of staleInviteIds) {
        await cleanupInvitationPayload(staleInviteId, tx);
      }
    }

    if (existingInvite) {
      await tx
        .update(invitations)
        .set({
          invitedByUserId,
          tokenHash,
          allowedAuthMethods: finalAllowedAuthMethods,
          sentAt,
          expiresAt,
          updatedAt: now,
        })
        .where(eq(invitations.id, existingInvite.id));
    } else {
      await tx.insert(invitations).values({
        id: invitationId,
        inviterOrgId,
        invitedByUserId,
        email: normalizedEmail,
        tokenHash,
        status: 'sent',
        allowedAuthMethods: finalAllowedAuthMethods,
        sentAt,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const target of input.targets) {
      await upsertInvitationTargetSnapshot(tx, invitationId, target, now);
    }
  });

  await sendInvitationEmail(normalizedEmail, token);
  await activityService.log({
    organizationId: inviterOrgId,
    actorId: invitedByUserId,
    entityType: 'invitation',
    entityId: invitationId,
    action: 'invitation_created',
    changes: {
      email: { before: null, after: normalizedEmail },
      expiresAt: { before: null, after: expiresAt.toISOString() },
    },
  });
  await activityService.log({
    organizationId: inviterOrgId,
    actorId: invitedByUserId,
    entityType: 'invitation',
    entityId: invitationId,
    action: 'invitation_sent',
    changes: {
      allowedAuthMethods: { before: null, after: finalAllowedAuthMethods },
      targetOrganizations: { before: null, after: targetOrgIds },
    },
  });

  return {
    invitation: {
      id: invitationId,
      email: normalizedEmail,
      status: 'sent',
      sentAt: sentAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      allowedAuthMethods: finalAllowedAuthMethods,
    },
    token,
  };
}

export async function listSentInvitations(orgId: string): Promise<InvitationOutput[]> {
  await cleanupExpiredInvitations();

  const rows = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.inviterOrgId, orgId), eq(invitations.status, 'sent')));

  return rows
    .filter((row) => row.expiresAt > new Date())
    .map((row) => ({
      id: row.id,
      email: row.email,
      status: resolveStatus(row),
      sentAt: row.sentAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      allowedAuthMethods: normalizeStringArray(row.allowedAuthMethods),
    }));
}

export async function getInvitationById(
  orgId: string,
  invitationId: string,
): Promise<InvitationOutput> {
  await cleanupExpiredInvitations();
  const row = (
    await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, invitationId), eq(invitations.inviterOrgId, orgId)))
      .limit(1)
  )[0];

  if (!row) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Invitation not found');
  }

  return {
    id: row.id,
    email: row.email,
    status: resolveStatus(row),
    sentAt: row.sentAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    allowedAuthMethods: normalizeStringArray(row.allowedAuthMethods),
  };
}

export async function resendInvitation(
  orgId: string,
  invitationId: string,
  actorUserId: string,
): Promise<{ invitation: InvitationOutput; token: string }> {
  await cleanupExpiredInvitations();

  const row = (
    await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, invitationId), eq(invitations.inviterOrgId, orgId)))
      .limit(1)
  )[0];

  if (!row) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Invitation not found');
  }

  if (row.status !== 'sent' || row.expiresAt <= new Date()) {
    throw new AppError(410, ErrorCode.GONE, 'Invitation is no longer valid');
  }

  const token = generateRawToken();
  const sentAt = new Date();
  const expiresAt = computeExpiry(sentAt);

  await db
    .update(invitations)
    .set({
      tokenHash: hashToken(token),
      sentAt,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, invitationId));

  await sendInvitationEmail(row.email, token);
  await activityService.log({
    organizationId: row.inviterOrgId,
    actorId: actorUserId,
    entityType: 'invitation',
    entityId: row.id,
    action: 'invitation_resent',
    changes: {
      sentAt: { before: null, after: sentAt.toISOString() },
      expiresAt: { before: null, after: expiresAt.toISOString() },
    },
  });

  return {
    invitation: {
      id: row.id,
      email: row.email,
      status: 'sent',
      sentAt: sentAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      allowedAuthMethods: normalizeStringArray(row.allowedAuthMethods),
    },
    token,
  };
}

export async function revokeInvitation(
  orgId: string,
  invitationId: string,
  actorUserId: string,
): Promise<void> {
  await cleanupExpiredInvitations();

  const row = (
    await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, invitationId), eq(invitations.inviterOrgId, orgId)))
      .limit(1)
  )[0];

  if (!row) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Invitation not found');
  }

  if (row.status !== 'sent' || row.expiresAt <= new Date()) {
    throw new AppError(410, ErrorCode.GONE, 'Invitation is no longer valid');
  }

  await db
    .update(invitations)
    .set({
      status: 'revoked',
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, invitationId));

  await cleanupInvitationPayload(invitationId);
  await sendInvitationRevokedEmail(row.email);
  await activityService.log({
    organizationId: row.inviterOrgId,
    actorId: actorUserId,
    entityType: 'invitation',
    entityId: row.id,
    action: 'invitation_revoked',
    changes: {
      email: { before: row.email, after: row.email },
      revokedAt: { before: null, after: new Date().toISOString() },
    },
  });
}

export async function validateInvitationToken(token: string): Promise<InvitationTokenInfo> {
  await cleanupExpiredInvitations();
  const tokenHash = hashToken(token);
  const invite = (
    await db.select().from(invitations).where(eq(invitations.tokenHash, tokenHash)).limit(1)
  )[0];

  if (!invite) {
    throw new AppError(410, ErrorCode.GONE, 'This invitation is no longer valid');
  }
  assertInvitableStatusOrThrow(invite);

  const targets = await getTargetRows(invite.id);
  const allowedAuthMethods = await computeAllowedAuthMethods(
    targets.map((target) => target.organizationId),
    invite.allowedAuthMethods,
  );

  if (allowedAuthMethods.length === 0) {
    throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'No allowed authentication methods');
  }

  return {
    invitationId: invite.id,
    email: invite.email,
    allowedAuthMethods,
    targets: targets.map((target) => ({
      organizationId: target.organizationId,
      organizationName: target.organizationName,
    })),
    status: 'sent',
  };
}

async function consumeInviteWithUserId(
  inviteToken: string,
  userId: string,
  consumedByUserId: string,
): Promise<void> {
  const tokenHash = hashToken(inviteToken);
  const acceptedInvite = await db.transaction(async (tx) => {
    const invite = (
      await tx.select().from(invitations).where(eq(invitations.tokenHash, tokenHash)).limit(1)
    )[0];

    if (!invite) {
      throw new AppError(410, ErrorCode.GONE, 'This invitation is no longer valid');
    }
    assertInvitableStatusOrThrow(invite);

    const applied = await applyInvitationSnapshot(tx, invite.id, userId, invite.invitedByUserId);

    await tx
      .update(invitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        consumedByUserId,
        updatedAt: new Date(),
      })
      .where(and(eq(invitations.id, invite.id), eq(invitations.status, 'sent')));

    const updatedRow = (
      await tx
        .select({ status: invitations.status })
        .from(invitations)
        .where(eq(invitations.id, invite.id))
        .limit(1)
    )[0];
    if (!updatedRow || updatedRow.status !== 'accepted') {
      throw new AppError(409, ErrorCode.CONFLICT, 'Invitation already consumed');
    }

    await cleanupInvitationPayload(invite.id, tx);
    return {
      invitationId: invite.id,
      inviterOrgId: invite.inviterOrgId,
      invitedByUserId: invite.invitedByUserId,
      applied,
    };
  });

  await logInvitationAcceptance({
    invitationId: acceptedInvite.invitationId,
    inviterOrgId: acceptedInvite.inviterOrgId,
    invitedByUserId: acceptedInvite.invitedByUserId,
    consumedByUserId,
    authMethod: 'existing_account',
    applied: acceptedInvite.applied,
  });
}

export async function acceptInvitationWithPassword(
  token: string,
  password: string,
  jwtSign: (payload: JwtPayload, options: { expiresIn: number }) => string,
  ip?: string,
  userAgent?: string,
): Promise<{ user: typeof users.$inferSelect; tokens: TokenPair }> {
  const tokenHash = hashToken(token);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  let userId = '';

  const acceptedInvite = await db.transaction(async (tx) => {
    const invite = (
      await tx.select().from(invitations).where(eq(invitations.tokenHash, tokenHash)).limit(1)
    )[0];

    if (!invite) {
      throw new AppError(410, ErrorCode.GONE, 'This invitation is no longer valid');
    }
    assertInvitableStatusOrThrow(invite);

    const targetOrgIds = await getInvitationTargetOrganizationIds(invite.id, tx);
    const allowedAuthMethods = await computeAllowedAuthMethods(
      targetOrgIds,
      invite.allowedAuthMethods,
      tx,
    );
    if (!allowedAuthMethods.includes('password')) {
      throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'Password auth is not allowed');
    }

    const normalizedInviteEmail = normalizeEmail(invite.email);
    const existingUser = (
      await tx
        .select()
        .from(users)
        .where(and(eq(users.email, normalizedInviteEmail), isNull(users.deletedAt)))
        .limit(1)
    )[0];
    if (existingUser) {
      throw new AppError(
        409,
        ErrorCode.CONFLICT,
        'Account already exists. Sign in to continue this invitation.',
      );
    }

    const now = new Date();
    userId = crypto.randomUUID();
    await tx.insert(users).values({
      id: userId,
      email: normalizedInviteEmail,
      passwordHash,
      displayName: normalizedInviteEmail.split('@')[0],
      emailVerifiedAt: now,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    });

    const applied = await applyInvitationSnapshot(tx, invite.id, userId, invite.invitedByUserId);

    await tx
      .update(invitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        consumedByUserId: userId,
        updatedAt: new Date(),
      })
      .where(and(eq(invitations.id, invite.id), eq(invitations.status, 'sent')));

    const updatedRow = (
      await tx
        .select({ status: invitations.status })
        .from(invitations)
        .where(eq(invitations.id, invite.id))
        .limit(1)
    )[0];
    if (!updatedRow || updatedRow.status !== 'accepted') {
      throw new AppError(409, ErrorCode.CONFLICT, 'Invitation already consumed');
    }

    await cleanupInvitationPayload(invite.id, tx);
    return {
      invitationId: invite.id,
      inviterOrgId: invite.inviterOrgId,
      invitedByUserId: invite.invitedByUserId,
      applied,
    };
  });

  if (!userId) {
    throw new AppError(500, ErrorCode.INTERNAL_ERROR, 'Failed to resolve invited user');
  }
  await logInvitationAcceptance({
    invitationId: acceptedInvite.invitationId,
    inviterOrgId: acceptedInvite.inviterOrgId,
    invitedByUserId: acceptedInvite.invitedByUserId,
    consumedByUserId: userId,
    authMethod: 'password',
    applied: acceptedInvite.applied,
  });

  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  const tokens = await createSession(user, jwtSign, ip, userAgent);

  return { user, tokens };
}

export async function acceptInvitationForExistingUser(
  token: string,
  authenticatedUserId: string,
): Promise<typeof users.$inferSelect> {
  const inviteInfo = await validateInvitationToken(token);
  const user = (
    await db
      .select()
      .from(users)
      .where(and(eq(users.id, authenticatedUserId), isNull(users.deletedAt)))
      .limit(1)
  )[0];

  if (!user) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }

  if (normalizeEmail(user.email) !== normalizeEmail(inviteInfo.email)) {
    throw new AppError(
      409,
      ErrorCode.CONFLICT,
      'Signed-in account does not match invited email. Sign in with the invited account.',
    );
  }

  await consumeInviteWithUserId(token, user.id, user.id);
  return (await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0];
}

export async function acceptInvitationWithOAuth(
  inviteTokenHash: string,
  identity: OAuthInviteIdentity,
  jwtSign: (payload: JwtPayload, options: { expiresIn: number }) => string,
  ip?: string,
  userAgent?: string,
): Promise<{ user: typeof users.$inferSelect; tokens: TokenPair }> {
  let userId = '';
  let oauthLinked = false;
  const normalizedProviderEmail = normalizeEmail(identity.email);
  const acceptedInvite = await db.transaction(async (tx) => {
    const invite = (
      await tx.select().from(invitations).where(eq(invitations.tokenHash, inviteTokenHash)).limit(1)
    )[0];

    if (!invite) {
      throw new AppError(410, ErrorCode.GONE, 'This invitation is no longer valid');
    }
    assertInvitableStatusOrThrow(invite);

    const targetOrgIds = await getInvitationTargetOrganizationIds(invite.id, tx);
    const allowedAuthMethods = await computeAllowedAuthMethods(
      targetOrgIds,
      invite.allowedAuthMethods,
      tx,
    );
    if (!allowedAuthMethods.includes(identity.provider)) {
      throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'OAuth provider is not allowed');
    }

    const normalizedInviteEmail = normalizeEmail(invite.email);
    if (normalizedInviteEmail !== normalizedProviderEmail) {
      throw new AppError(
        422,
        ErrorCode.UNPROCESSABLE_ENTITY,
        'Invited email does not match OAuth email',
      );
    }

    const existingProviderAccount = (
      await tx
        .select()
        .from(oauthAccounts)
        .where(
          and(
            eq(oauthAccounts.provider, identity.provider),
            eq(oauthAccounts.providerUserId, identity.providerUserId),
          ),
        )
        .limit(1)
    )[0];

    if (existingProviderAccount) {
      const linkedUser = (
        await tx.select().from(users).where(eq(users.id, existingProviderAccount.userId)).limit(1)
      )[0];
      if (!linkedUser || normalizeEmail(linkedUser.email) !== normalizedInviteEmail) {
        throw new AppError(
          409,
          ErrorCode.CONFLICT,
          'OAuth identity is already linked to another user',
        );
      }
      userId = linkedUser.id;
    } else {
      const existingEmailUser = (
        await tx
          .select()
          .from(users)
          .where(and(eq(users.email, normalizedInviteEmail), isNull(users.deletedAt)))
          .limit(1)
      )[0];

      if (existingEmailUser) {
        userId = existingEmailUser.id;
        const existingUserProviderLink = (
          await tx
            .select({
              id: oauthAccounts.id,
              providerUserId: oauthAccounts.providerUserId,
            })
            .from(oauthAccounts)
            .where(
              and(
                eq(oauthAccounts.userId, existingEmailUser.id),
                eq(oauthAccounts.provider, identity.provider),
              ),
            )
            .limit(1)
        )[0];

        if (
          existingUserProviderLink &&
          existingUserProviderLink.providerUserId !== identity.providerUserId
        ) {
          throw new AppError(
            409,
            ErrorCode.CONFLICT,
            'OAuth provider is already linked to another identity for this account',
          );
        }

        if (!existingUserProviderLink) {
          await tx.insert(oauthAccounts).values({
            id: crypto.randomUUID(),
            userId,
            provider: identity.provider,
            providerUserId: identity.providerUserId,
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          oauthLinked = true;
        }
      } else {
        userId = crypto.randomUUID();
        await tx.insert(users).values({
          id: userId,
          email: normalizedInviteEmail,
          passwordHash: null,
          displayName: identity.displayName,
          avatarUrl: identity.avatarUrl,
          emailVerifiedAt: new Date(),
          mustChangePassword: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await tx.insert(oauthAccounts).values({
          id: crypto.randomUUID(),
          userId,
          provider: identity.provider,
          providerUserId: identity.providerUserId,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        oauthLinked = true;
      }
    }

    const applied = await applyInvitationSnapshot(tx, invite.id, userId, invite.invitedByUserId);

    await tx
      .update(invitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        consumedByUserId: userId,
        updatedAt: new Date(),
      })
      .where(and(eq(invitations.id, invite.id), eq(invitations.status, 'sent')));

    const updatedRow = (
      await tx
        .select({ status: invitations.status })
        .from(invitations)
        .where(eq(invitations.id, invite.id))
        .limit(1)
    )[0];
    if (!updatedRow || updatedRow.status !== 'accepted') {
      throw new AppError(409, ErrorCode.CONFLICT, 'Invitation already consumed');
    }

    await cleanupInvitationPayload(invite.id, tx);
    return {
      invitationId: invite.id,
      inviterOrgId: invite.inviterOrgId,
      invitedByUserId: invite.invitedByUserId,
      applied,
    };
  });

  if (!userId) {
    throw new AppError(500, ErrorCode.INTERNAL_ERROR, 'Failed to resolve invited user');
  }
  await logInvitationAcceptance({
    invitationId: acceptedInvite.invitationId,
    inviterOrgId: acceptedInvite.inviterOrgId,
    invitedByUserId: acceptedInvite.invitedByUserId,
    consumedByUserId: userId,
    authMethod: `oauth:${identity.provider}`,
    applied: acceptedInvite.applied,
    oauthProviderLinked: oauthLinked ? identity.provider : undefined,
  });

  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  const tokens = await createSession(user, jwtSign, ip, userAgent);
  return { user, tokens };
}

export async function assertInvitationOAuthAllowed(
  token: string,
  provider: string,
): Promise<string> {
  const inviteInfo = await validateInvitationToken(token);
  if (!inviteInfo.allowedAuthMethods.includes(provider)) {
    throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'OAuth provider is not allowed');
  }
  return hashToken(token);
}
