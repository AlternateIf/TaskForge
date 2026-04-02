import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSelect, mockUpdate, mockDelete, mockInsert, mockPublish, mockActivityLog } = vi.hoisted(
  () => ({
    mockSelect: vi.fn(),
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
    mockInsert: vi.fn(),
    mockPublish: vi.fn(),
    mockActivityLog: vi.fn(),
  }),
);

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
    insert: mockInsert,
    transaction: vi.fn(),
  },
  invitations: {
    id: 'invitations.id',
    inviterOrgId: 'invitations.inviterOrgId',
    invitedByUserId: 'invitations.invitedByUserId',
    email: 'invitations.email',
    tokenHash: 'invitations.tokenHash',
    status: 'invitations.status',
    allowedAuthMethods: 'invitations.allowedAuthMethods',
    sentAt: 'invitations.sentAt',
    expiresAt: 'invitations.expiresAt',
    acceptedAt: 'invitations.acceptedAt',
    revokedAt: 'invitations.revokedAt',
    consumedByUserId: 'invitations.consumedByUserId',
    createdAt: 'invitations.createdAt',
    updatedAt: 'invitations.updatedAt',
  },
  invitationTargets: {
    id: 'invitationTargets.id',
    invitationId: 'invitationTargets.invitationId',
    organizationId: 'invitationTargets.organizationId',
  },
  invitationTargetPermissions: {
    invitationTargetId: 'invitationTargetPermissions.invitationTargetId',
    permissionKey: 'invitationTargetPermissions.permissionKey',
  },
  invitationTargetRoles: {
    invitationTargetId: 'invitationTargetRoles.invitationTargetId',
    roleId: 'invitationTargetRoles.roleId',
  },
  oauthAccounts: {
    id: 'oauthAccounts.id',
  },
  organizationAuthSettings: {
    organizationId: 'organizationAuthSettings.organizationId',
    passwordAuthEnabled: 'organizationAuthSettings.passwordAuthEnabled',
    googleOauthEnabled: 'organizationAuthSettings.googleOauthEnabled',
    githubOauthEnabled: 'organizationAuthSettings.githubOauthEnabled',
  },
  organizationMembers: {
    id: 'organizationMembers.id',
    organizationId: 'organizationMembers.organizationId',
    userId: 'organizationMembers.userId',
  },
  organizations: {
    id: 'organizations.id',
    name: 'organizations.name',
  },
  permissionAssignments: {
    id: 'permissionAssignments.id',
    userId: 'permissionAssignments.userId',
    organizationId: 'permissionAssignments.organizationId',
    permissionKey: 'permissionAssignments.permissionKey',
  },
  roleAssignments: {
    id: 'roleAssignments.id',
    userId: 'roleAssignments.userId',
    organizationId: 'roleAssignments.organizationId',
    roleId: 'roleAssignments.roleId',
  },
  roles: {
    id: 'roles.id',
    organizationId: 'roles.organizationId',
  },
  users: {
    id: 'users.id',
    email: 'users.email',
    deletedAt: 'users.deletedAt',
  },
}));

vi.mock('../activity.service.js', () => ({
  log: mockActivityLog,
}));

vi.mock('../auth.service.js', () => ({
  createSession: vi.fn(),
}));

vi.mock('../permission.service.js', () => ({}));

vi.mock('../../queues/publisher.js', () => ({
  publish: mockPublish,
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ _type: 'and', args })),
  eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b })),
  inArray: vi.fn((a: unknown, b: unknown[]) => ({ _type: 'inArray', a, b })),
  isNull: vi.fn((a: unknown) => ({ _type: 'isNull', a })),
  lt: vi.fn((a: unknown, b: unknown) => ({ _type: 'lt', a, b })),
}));

function setupSelectWhere(result: unknown) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    innerJoin: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockResolvedValueOnce(result);
  chain.limit.mockResolvedValueOnce(result);
  chain.innerJoin.mockReturnValue(chain);
}

function setupSelectLimit(result: unknown) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    innerJoin: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockResolvedValueOnce(result);
  chain.innerJoin.mockReturnValue(chain);
}

function setupUpdateWhere() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  mockUpdate.mockReturnValueOnce({ set });
  return { set, where };
}

describe('invitation.service lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks resend for terminal invites', async () => {
    setupSelectWhere([]);
    setupSelectLimit([
      {
        id: 'invite-1',
        inviterOrgId: 'org-1',
        invitedByUserId: 'inviter-1',
        email: 'user@example.com',
        status: 'revoked',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    ]);

    const invitationService = await import('../invitation.service.js');
    await expect(
      invitationService.resendInvitation('org-1', 'invite-1', 'actor-1'),
    ).rejects.toThrow('Invitation is no longer valid');
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('returns conflict for already-consumed invitation token', async () => {
    setupSelectWhere([]);
    setupSelectLimit([
      {
        id: 'invite-1',
        inviterOrgId: 'org-1',
        invitedByUserId: 'inviter-1',
        email: 'user@example.com',
        status: 'accepted',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        allowedAuthMethods: ['password'],
      },
    ]);

    const invitationService = await import('../invitation.service.js');
    await expect(invitationService.validateInvitationToken('a'.repeat(64))).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Invitation already consumed',
    });
  });

  it('resends sent invite with a new token and logs audit event', async () => {
    setupSelectWhere([]);
    setupSelectLimit([
      {
        id: 'invite-1',
        inviterOrgId: 'org-1',
        invitedByUserId: 'inviter-1',
        email: 'user@example.com',
        status: 'sent',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        allowedAuthMethods: ['password'],
      },
    ]);
    setupUpdateWhere();

    const invitationService = await import('../invitation.service.js');
    const result = await invitationService.resendInvitation('org-1', 'invite-1', 'actor-1');

    expect(result.invitation.id).toBe('invite-1');
    expect(result.invitation.status).toBe('sent');
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(10);
    expect(mockPublish).toHaveBeenCalledWith(
      'email.send',
      expect.objectContaining({
        to: 'user@example.com',
        templateName: 'invitation',
      }),
    );
    expect(mockActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        actorId: 'actor-1',
        action: 'invitation_resent',
      }),
    );
  });

  it('revokes invite, cleans payload, sends mail, and logs audit event', async () => {
    setupSelectWhere([]);
    setupSelectLimit([
      {
        id: 'invite-1',
        inviterOrgId: 'org-1',
        invitedByUserId: 'inviter-1',
        email: 'user@example.com',
        status: 'sent',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    ]);
    setupUpdateWhere();
    setupSelectWhere([]);

    const invitationService = await import('../invitation.service.js');
    await invitationService.revokeInvitation('org-1', 'invite-1', 'actor-1');

    expect(mockPublish).toHaveBeenCalledWith(
      'email.send',
      expect.objectContaining({
        to: 'user@example.com',
        templateName: 'invitation_revoked',
      }),
    );
    expect(mockActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        actorId: 'actor-1',
        action: 'invitation_revoked',
      }),
    );
  });
});
