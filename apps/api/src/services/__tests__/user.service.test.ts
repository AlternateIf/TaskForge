import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSelect, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
  },
  organizationMembers: {
    organizationId: 'organizationMembers.organizationId',
    userId: 'organizationMembers.userId',
  },
  organizations: {
    id: 'organizations.id',
    name: 'organizations.name',
  },
  roleAssignments: {
    roleId: 'roleAssignments.roleId',
    organizationId: 'roleAssignments.organizationId',
    userId: 'roleAssignments.userId',
  },
  roles: {
    id: 'roles.id',
    name: 'roles.name',
  },
  permissions: {
    roleId: 'permissions.roleId',
    resource: 'permissions.resource',
    action: 'permissions.action',
    scope: 'permissions.scope',
  },
  permissionAssignments: {
    userId: 'permissionAssignments.userId',
    organizationId: 'permissionAssignments.organizationId',
    permissionKey: 'permissionAssignments.permissionKey',
  },
  projectMembers: {
    roleId: 'projectMembers.roleId',
    projectId: 'projectMembers.projectId',
    userId: 'projectMembers.userId',
  },
  projects: {
    id: 'projects.id',
    organizationId: 'projects.organizationId',
    deletedAt: 'projects.deletedAt',
  },
  users: {
    id: 'users.id',
    email: 'users.email',
    displayName: 'users.displayName',
    avatarUrl: 'users.avatarUrl',
    deletedAt: 'users.deletedAt',
    updatedAt: 'users.updatedAt',
  },
  sessions: {
    userId: 'sessions.userId',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ _type: 'eq', left: a, right: b })),
  and: vi.fn((...args: unknown[]) => ({ _type: 'and', conditions: args })),
  or: vi.fn((...args: unknown[]) => ({ _type: 'or', conditions: args })),
  isNull: vi.fn((a) => ({ _type: 'isNull', field: a })),
}));

const { getUserById, updateProfile, deleteAccount, toUserOutput } = await import(
  '../user.service.js'
);

const userId = '00000000-0000-0000-0000-000000000001';
const now = new Date('2025-01-01T00:00:00.000Z');

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hash',
    displayName: 'Test User',
    avatarUrl: null,
    mfaEnabled: false,
    mfaSecret: null,
    emailVerifiedAt: null,
    mustChangePassword: false,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function setupSelectChain(resolvedRows: unknown[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockResolvedValueOnce(resolvedRows);
}

function setupSelectWhereChain(resolvedRows: unknown[]) {
  const chain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.where.mockResolvedValueOnce(resolvedRows);
}

function setupUpdateChain() {
  const chain = {
    set: vi.fn(),
    where: vi.fn(),
  };
  mockUpdate.mockReturnValueOnce(chain);
  chain.set.mockReturnValue(chain);
  chain.where.mockResolvedValueOnce(undefined);
}

function setupDeleteChain() {
  const chain = {
    where: vi.fn(),
  };
  mockDelete.mockReturnValueOnce(chain);
  chain.where.mockResolvedValueOnce(undefined);
}

describe('user.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('toUserOutput', () => {
    it('should map user to output format', () => {
      const user = makeUser();
      const output = toUserOutput(user as never);

      expect(output).toEqual({
        id: userId,
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        emailVerifiedAt: null,
        mustChangePassword: false,
        createdAt: now.toISOString(),
      });
    });

    it('should include avatarUrl when set', () => {
      const user = makeUser({ avatarUrl: 'https://example.com/avatar.png' });
      const output = toUserOutput(user as never);

      expect(output.avatarUrl).toBe('https://example.com/avatar.png');
    });
  });

  describe('getUserById', () => {
    it('should return user profile', async () => {
      setupSelectChain([makeUser()]);
      setupSelectWhereChain([{ id: 'org-1', name: 'Acme' }]);
      setupSelectWhereChain([]);
      setupSelectWhereChain([]);
      setupSelectWhereChain([]);

      const result = await getUserById(userId);

      expect(result.id).toBe(userId);
      expect(result.email).toBe('test@example.com');
      expect(result.displayName).toBe('Test User');
    });

    it('should throw 404 for non-existent user', async () => {
      setupSelectChain([]);

      await expect(getUserById('bad-id')).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    it('should update display name', async () => {
      setupUpdateChain();
      setupSelectChain([makeUser({ displayName: 'New Name' })]);
      setupSelectWhereChain([{ id: 'org-1', name: 'Acme' }]);
      setupSelectWhereChain([]);
      setupSelectWhereChain([]);
      setupSelectWhereChain([]);

      const result = await updateProfile(userId, { displayName: 'New Name' });

      expect(result.displayName).toBe('New Name');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should update avatar URL', async () => {
      setupUpdateChain();
      setupSelectChain([makeUser({ avatarUrl: 'https://example.com/new.png' })]);
      setupSelectWhereChain([{ id: 'org-1', name: 'Acme' }]);
      setupSelectWhereChain([]);
      setupSelectWhereChain([]);
      setupSelectWhereChain([]);

      const result = await updateProfile(userId, {
        avatarUrl: 'https://example.com/new.png',
      });

      expect(result.avatarUrl).toBe('https://example.com/new.png');
    });

    it('should allow clearing avatar by setting null', async () => {
      setupUpdateChain();
      setupSelectChain([makeUser({ avatarUrl: null })]);
      setupSelectWhereChain([{ id: 'org-1', name: 'Acme' }]);
      setupSelectWhereChain([]);
      setupSelectWhereChain([]);
      setupSelectWhereChain([]);

      const result = await updateProfile(userId, { avatarUrl: null });

      expect(result.avatarUrl).toBeNull();
    });
  });

  describe('deleteAccount', () => {
    it('should soft-delete user and invalidate all sessions', async () => {
      setupSelectChain([{ id: userId, deletedAt: null }]);
      setupUpdateChain(); // soft-delete
      setupDeleteChain(); // delete sessions

      const result = await deleteAccount(userId);

      expect(result.message).toContain('Account scheduled for deletion');
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should throw 404 for non-existent user', async () => {
      setupSelectChain([]);

      await expect(deleteAccount('bad-id')).rejects.toThrow('User not found');
    });

    it('should reject if account is already deleted', async () => {
      setupSelectChain([{ id: userId, deletedAt: now }]);

      await expect(deleteAccount(userId)).rejects.toThrow(
        'Account is already scheduled for deletion',
      );
    });

    it('should set deletedAt before invalidating sessions', async () => {
      const callOrder: string[] = [];
      setupSelectChain([{ id: userId, deletedAt: null }]);

      mockUpdate.mockImplementationOnce(() => {
        callOrder.push('update');
        const chain = { set: vi.fn(), where: vi.fn() };
        chain.set.mockReturnValue(chain);
        chain.where.mockResolvedValueOnce(undefined);
        return chain;
      });

      mockDelete.mockImplementationOnce(() => {
        callOrder.push('delete');
        const chain = { where: vi.fn() };
        chain.where.mockResolvedValueOnce(undefined);
        return chain;
      });

      await deleteAccount(userId);

      expect(callOrder).toEqual(['update', 'delete']);
    });

    it('should return message with grace period info', async () => {
      setupSelectChain([{ id: userId, deletedAt: null }]);
      setupUpdateChain();
      setupDeleteChain();

      const result = await deleteAccount(userId);

      expect(result.message).toContain('30 days');
      expect(result.message).toContain('Contact support to restore');
    });
  });
});
