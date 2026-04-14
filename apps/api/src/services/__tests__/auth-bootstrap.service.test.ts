import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSelect, mockInsert, mockUpdate, mockBcryptHash } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockBcryptHash: vi.fn(),
}));

const { mockGetAvailableProviders } = vi.hoisted(() => ({
  mockGetAvailableProviders: vi.fn(),
}));

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  },
  roleAssignments: {
    id: 'roleAssignments.id',
    userId: 'roleAssignments.userId',
    roleId: 'roleAssignments.roleId',
    organizationId: 'roleAssignments.organizationId',
    assignedByUserId: 'roleAssignments.assignedByUserId',
    createdAt: 'roleAssignments.createdAt',
    updatedAt: 'roleAssignments.updatedAt',
  },
  roles: {
    id: 'roles.id',
    name: 'roles.name',
    organizationId: 'roles.organizationId',
  },
  sessions: {
    id: 'sessions.id',
    userId: 'sessions.userId',
    tokenHash: 'sessions.tokenHash',
    expiresAt: 'sessions.expiresAt',
  },
  users: {
    id: 'users.id',
    email: 'users.email',
    passwordHash: 'users.passwordHash',
    mustChangePassword: 'users.mustChangePassword',
    deletedAt: 'users.deletedAt',
    updatedAt: 'users.updatedAt',
  },
  verificationTokens: {
    id: 'verificationTokens.id',
    userId: 'verificationTokens.userId',
    type: 'verificationTokens.type',
    tokenHash: 'verificationTokens.tokenHash',
    usedAt: 'verificationTokens.usedAt',
    expiresAt: 'verificationTokens.expiresAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ _type: 'and', args })),
  eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b })),
  gt: vi.fn((a: unknown, b: unknown) => ({ _type: 'gt', a, b })),
  isNull: vi.fn((a: unknown) => ({ _type: 'isNull', a })),
  ne: vi.fn((a: unknown, b: unknown) => ({ _type: 'ne', a, b })),
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: mockBcryptHash,
    compare: vi.fn(),
  },
}));

vi.mock('../oauth.service.js', () => ({
  getAvailableProviders: mockGetAvailableProviders,
}));

function setupSelectLimit(result: unknown) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockResolvedValueOnce(result);
}

describe('auth.service bootstrapSuperAdmin', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockGetAvailableProviders.mockReturnValue([]);
  });

  it('throws in production when bootstrap env vars are missing', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL', '');
    vi.stubEnv('AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD', '');

    const authService = await import('../auth.service.js');
    await expect(authService.bootstrapSuperAdmin()).rejects.toThrow(
      'AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL and AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD are required in production',
    );
  });

  it('keeps existing bootstrap super user in must-change-password state', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL', 'root@example.com');
    vi.stubEnv('AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD', 'StrongPass123!');

    setupSelectLimit([{ id: 'role-super' }]);
    setupSelectLimit([{ id: 'user-super', passwordHash: 'already-set' }]);
    setupSelectLimit([{ id: 'assignment-super' }]);

    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    mockUpdate.mockReturnValueOnce({ set: updateSet });

    const authService = await import('../auth.service.js');
    await authService.bootstrapSuperAdmin();

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        mustChangePassword: true,
      }),
    );
    expect(updateWhere).toHaveBeenCalledTimes(1);
  });

  it('skips bootstrap creation in development when deterministic seed fixtures are present', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL', '');
    vi.stubEnv('AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD', '');

    setupSelectLimit([{ id: 'seed-owner' }]);

    const authService = await import('../auth.service.js');
    await authService.bootstrapSuperAdmin();

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('marks requiresInitialSetup=true when invite-only and no users exist', async () => {
    vi.stubEnv('AUTH_ALLOW_PUBLIC_REGISTER', 'false');
    mockGetAvailableProviders.mockReturnValue([{ id: 'google' }]);
    setupSelectLimit([]);

    const authService = await import('../auth.service.js');
    const config = await authService.getAuthConfig();

    expect(config).toEqual({
      allowPublicRegister: false,
      enabledOAuthProviders: ['google'],
      requiresInitialSetup: true,
    });
  });

  it('marks requiresInitialSetup=false when at least one user exists', async () => {
    vi.stubEnv('AUTH_ALLOW_PUBLIC_REGISTER', 'false');
    mockGetAvailableProviders.mockReturnValue([{ id: 'github' }]);
    setupSelectLimit([{ id: 'user-1' }]);

    const authService = await import('../auth.service.js');
    const config = await authService.getAuthConfig();

    expect(config).toEqual({
      allowPublicRegister: false,
      enabledOAuthProviders: ['github'],
      requiresInitialSetup: false,
    });
  });
});
