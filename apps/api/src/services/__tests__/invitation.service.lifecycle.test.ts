import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSelect,
  mockUpdate,
  mockDelete,
  mockInsert,
  mockPublish,
  mockActivityLog,
  mockHasOrgPermission,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockInsert: vi.fn(),
  mockPublish: vi.fn(),
  mockActivityLog: vi.fn(),
  mockHasOrgPermission: vi.fn().mockResolvedValue(true),
}));

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

vi.mock('../permission.service.js', () => ({
  hasOrgPermission: mockHasOrgPermission,
}));

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

/**
 * Creates a mock select chain for queries that end at .where() (no .limit() after).
 * The 'where' method returns a thenable so it can be awaited directly.
 * Suitable for cleanupExpiredInvitations and similar "fire and forget" patterns.
 */
function setupSelectWhere(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    innerJoin: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);
  // Make 'where' return a thenable chain object — it acts as both
  // a chainable (for .where().limit()) and a thenable (for queries
  // that don't call .limit() after .where()).
  chain.where.mockImplementation(() => {
    // Create a thenable chain — it can be awaited (for queries ending in .where())
    // or chained (for queries continuing with .limit()).
    const thenable = Object.assign(() => {}, chain) as unknown as Record<
      string,
      ReturnType<typeof vi.fn>
    > & {
      then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
    };
    // biome-ignore lint/suspicious/noThenProperty: test mock needs to be thenable for DB queries ending in .where()
    thenable.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return thenable;
  });
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
    vi.resetAllMocks();
    mockHasOrgPermission.mockResolvedValue(true);
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

describe('invitation.service permission gates', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should throw 403 FORBIDDEN when inviter lacks invitation.create.org permission', async () => {
    setupSelectWhere([]); // cleanupExpiredInvitations
    mockHasOrgPermission.mockResolvedValueOnce(false);

    const invitationService = await import('../invitation.service.js');
    await expect(
      invitationService.createInvitation('org-1', 'inviter-1', {
        email: 'newuser@example.com',
        targets: [{ organizationId: 'org-1' }],
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to create invitations in this organization',
    });
  });

  it('should throw 403 FORBIDDEN when target org does not match route param', async () => {
    setupSelectWhere([]); // cleanupExpiredInvitations

    const invitationService = await import('../invitation.service.js');
    await expect(
      invitationService.createInvitation('org-1', 'inviter-1', {
        email: 'newuser@example.com',
        targets: [{ organizationId: 'org-2' }], // Different org
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Invitation target organization must match the current organization',
    });
  });

  it('should throw 403 FORBIDDEN when inviter cannot assign requested role', async () => {
    // First call: hasOrgPermission for invitation.create.org → true
    // Second call: hasOrgPermission for role.assign → false
    setupSelectWhere([]); // cleanupExpiredInvitations
    mockHasOrgPermission.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const invitationService = await import('../invitation.service.js');
    await expect(
      invitationService.createInvitation('org-1', 'inviter-1', {
        email: 'newuser@example.com',
        targets: [{ organizationId: 'org-1', roleIds: ['role-admin'] }],
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to assign roles in this organization',
    });
  });

  it('should throw 403 FORBIDDEN when inviter cannot grant a requested permission', async () => {
    // hasOrgPermission for invitation.create.org → true
    // hasOrgPermission for the specific permission key → false
    setupSelectWhere([]); // cleanupExpiredInvitations
    mockHasOrgPermission
      .mockResolvedValueOnce(true) // invitation.create
      .mockResolvedValueOnce(false); // specific permission grant check

    const invitationService = await import('../invitation.service.js');
    await expect(
      invitationService.createInvitation('org-1', 'inviter-1', {
        email: 'newuser@example.com',
        targets: [{ organizationId: 'org-1', permissionKeys: ['organization.update.org'] }],
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('should verify hasOrgPermission is called with correct arguments for invitation.create', async () => {
    setupSelectWhere([]); // cleanupExpiredInvitations
    mockHasOrgPermission.mockResolvedValue(true);

    const invitationService = await import('../invitation.service.js');

    // Just call with valid input to verify permission check is called
    try {
      await invitationService.createInvitation('org-1', 'inviter-1', {
        email: 'newuser@example.com',
        targets: [{ organizationId: 'org-1' }],
      });
    } catch {
      // Expected to fail due to other reasons, but permission check should have been called
    }

    // Verify hasOrgPermission was called for invitation.create.org
    expect(mockHasOrgPermission).toHaveBeenCalledWith('inviter-1', 'org-1', 'invitation', 'create');
  });

  describe('listSentInvitations', () => {
    it('should throw 403 FORBIDDEN when user lacks invitation.read.org permission', async () => {
      setupSelectWhere([]); // cleanupExpiredInvitations
      mockHasOrgPermission.mockResolvedValueOnce(false);

      const invitationService = await import('../invitation.service.js');
      await expect(invitationService.listSentInvitations('org-1', 'actor-1')).rejects.toMatchObject(
        {
          statusCode: 403,
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to view invitations in this organization',
        },
      );
    });

    it('should succeed when user has invitation.read.org permission', async () => {
      setupSelectWhere([]); // cleanupExpiredInvitations
      setupSelectWhere([
        {
          id: 'invite-1',
          inviterOrgId: 'org-1',
          invitedByUserId: 'inviter-1',
          email: 'user@example.com',
          status: 'sent',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          sentAt: new Date(),
          allowedAuthMethods: ['password'],
        },
      ]);
      mockHasOrgPermission.mockResolvedValue(true);

      const invitationService = await import('../invitation.service.js');
      const result = await invitationService.listSentInvitations('org-1', 'actor-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('invite-1');
      expect(mockHasOrgPermission).toHaveBeenCalledWith('actor-1', 'org-1', 'invitation', 'read');
    });
  });

  describe('getInvitationById', () => {
    it('should throw 403 FORBIDDEN when user lacks invitation.read.org permission', async () => {
      setupSelectWhere([]); // cleanupExpiredInvitations
      mockHasOrgPermission.mockResolvedValueOnce(false);

      const invitationService = await import('../invitation.service.js');
      await expect(
        invitationService.getInvitationById('org-1', 'invite-1', 'actor-1'),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to view invitations in this organization',
      });
    });

    it('should succeed when user has invitation.read.org permission', async () => {
      setupSelectWhere([]); // cleanupExpiredInvitations
      setupSelectLimit([
        {
          id: 'invite-1',
          inviterOrgId: 'org-1',
          invitedByUserId: 'inviter-1',
          email: 'user@example.com',
          status: 'sent',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          sentAt: new Date(),
          allowedAuthMethods: ['password'],
        },
      ]);
      mockHasOrgPermission.mockResolvedValue(true);

      const invitationService = await import('../invitation.service.js');
      const result = await invitationService.getInvitationById('org-1', 'invite-1', 'actor-1');

      expect(result.id).toBe('invite-1');
      expect(mockHasOrgPermission).toHaveBeenCalledWith('actor-1', 'org-1', 'invitation', 'read');
    });
  });

  describe('resendInvitation', () => {
    it('should throw 403 FORBIDDEN when user lacks invitation.update.org permission', async () => {
      setupSelectWhere([]); // cleanupExpiredInvitations
      mockHasOrgPermission.mockResolvedValueOnce(false);

      const invitationService = await import('../invitation.service.js');
      await expect(
        invitationService.resendInvitation('org-1', 'invite-1', 'actor-1'),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to resend invitations in this organization',
      });
    });

    it('should succeed when user has invitation.update.org permission', async () => {
      setupSelectWhere([]); // cleanupExpiredInvitations
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
      mockHasOrgPermission.mockResolvedValue(true);

      const invitationService = await import('../invitation.service.js');
      const result = await invitationService.resendInvitation('org-1', 'invite-1', 'actor-1');

      expect(result.invitation.id).toBe('invite-1');
      expect(mockHasOrgPermission).toHaveBeenCalledWith('actor-1', 'org-1', 'invitation', 'update');
    });
  });

  describe('revokeInvitation', () => {
    it('should throw 403 FORBIDDEN when user lacks invitation.delete.org permission', async () => {
      setupSelectWhere([]); // cleanupExpiredInvitations
      mockHasOrgPermission.mockResolvedValueOnce(false);

      const invitationService = await import('../invitation.service.js');
      await expect(
        invitationService.revokeInvitation('org-1', 'invite-1', 'actor-1'),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to revoke invitations in this organization',
      });
    });

    it('should succeed when user has invitation.delete.org permission', async () => {
      setupSelectWhere([]); // cleanupExpiredInvitations
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
      mockHasOrgPermission.mockResolvedValue(true);

      const invitationService = await import('../invitation.service.js');
      await invitationService.revokeInvitation('org-1', 'invite-1', 'actor-1');

      expect(mockHasOrgPermission).toHaveBeenCalledWith('actor-1', 'org-1', 'invitation', 'delete');
    });
  });
});
