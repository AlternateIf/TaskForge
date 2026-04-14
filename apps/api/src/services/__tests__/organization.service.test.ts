import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSelect,
  mockUpdate,
  mockInsert,
  mockDelete,
  mockGetOrgCreatePermission,
  mockHasOrgPermission,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
  mockDelete: vi.fn(),
  mockGetOrgCreatePermission: vi.fn().mockResolvedValue(true),
  mockHasOrgPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
    delete: mockDelete,
    transaction: vi.fn(),
  },
  organizations: {
    id: 'organizations.id',
    name: 'organizations.name',
    slug: 'organizations.slug',
    logoUrl: 'organizations.logoUrl',
    settings: 'organizations.settings',
    trialExpiresAt: 'organizations.trialExpiresAt',
    deletedAt: 'organizations.deletedAt',
    createdAt: 'organizations.createdAt',
    updatedAt: 'organizations.updatedAt',
  },
  organizationMembers: {
    id: 'organizationMembers.id',
    organizationId: 'organizationMembers.organizationId',
    userId: 'organizationMembers.userId',
    roleId: 'organizationMembers.roleId',
    joinedAt: 'organizationMembers.joinedAt',
    createdAt: 'organizationMembers.createdAt',
    updatedAt: 'organizationMembers.updatedAt',
  },
  roleAssignments: {
    id: 'roleAssignments.id',
    userId: 'roleAssignments.userId',
    roleId: 'roleAssignments.roleId',
    organizationId: 'roleAssignments.organizationId',
  },
  roles: {
    id: 'roles.id',
    name: 'roles.name',
    organizationId: 'roles.organizationId',
  },
  projects: {
    id: 'projects.id',
    organizationId: 'projects.organizationId',
  },
  projectMembers: {
    id: 'projectMembers.id',
    projectId: 'projectMembers.projectId',
    userId: 'projectMembers.userId',
  },
  permissionAssignments: {
    id: 'permissionAssignments.id',
    userId: 'permissionAssignments.userId',
    organizationId: 'permissionAssignments.organizationId',
    permissionKey: 'permissionAssignments.permissionKey',
  },
  permissions: {
    id: 'permissions.id',
    roleId: 'permissions.roleId',
    resource: 'permissions.resource',
    action: 'permissions.action',
    scope: 'permissions.scope',
  },
  users: {
    id: 'users.id',
    email: 'users.email',
    displayName: 'users.displayName',
    mfaEnabled: 'users.mfaEnabled',
    deletedAt: 'users.deletedAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ _type: 'eq', left: a, right: b })),
  and: vi.fn((...args: unknown[]) => ({ _type: 'and', args })),
  inArray: vi.fn((a, b) => ({ _type: 'inArray', left: a, right: b })),
  isNull: vi.fn((a) => ({ _type: 'isNull', arg: a })),
  count: vi.fn(() => ({ _type: 'count' })),
  desc: vi.fn((a) => ({ _type: 'desc', arg: a })),
}));

vi.mock('../permission.service.js', () => ({
  hasOrgPermission: mockHasOrgPermission,
  getOrgCreatePermission: mockGetOrgCreatePermission,
}));

vi.mock('../activity.service.js', () => ({
  log: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../org-auth-settings.service.js', () => ({
  isEmailDomainAllowed: vi.fn().mockResolvedValue(true),
}));

vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn().mockResolvedValue({ mime: 'image/png', ext: 'png' }),
}));

/**
 * Creates a mock select chain that resolves with `resolvedRows`.
 * Supports `.from().where().limit()` and `.from().where()` patterns,
 * plus joins and groupBy.
 *
 * The `where` method returns the chain for chaining, and also
 * resolves as a promise directly (for queries without `.limit()`).
 */
function setupSelect(resolvedRows: unknown[]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    leftJoin: vi.fn(),
    innerJoin: vi.fn(),
    groupBy: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);

  const createThenableChain = () => {
    const thenable = Object.assign({}, chain) as Record<string, ReturnType<typeof vi.fn>> & {
      then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
    };
    // biome-ignore lint/suspicious/noThenProperty: test mock needs to be thenable for DB queries ending at arbitrary chain steps
    thenable.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(resolvedRows).then(resolve);
    return thenable;
  };

  // Make 'where' return a thenable chain object — it acts as both
  // a chainable (for .where().limit()) and a thenable (for queries
  // that don't call .limit() after .where()).
  chain.where.mockImplementation(() => createThenableChain());
  chain.orderBy.mockImplementation(() => createThenableChain());
  chain.limit.mockImplementation(() => createThenableChain());
  chain.offset.mockImplementation(() => createThenableChain());
  chain.leftJoin.mockReturnValue(chain as unknown as ReturnType<typeof vi.fn>);
  chain.innerJoin.mockReturnValue(chain as unknown as ReturnType<typeof vi.fn>);
  chain.groupBy.mockImplementation(() => createThenableChain());
  return chain as unknown as {
    from: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    offset: ReturnType<typeof vi.fn>;
    leftJoin: ReturnType<typeof vi.fn>;
    innerJoin: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
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

function setupInsertChain() {
  const chain = {
    values: vi.fn(),
  };
  mockInsert.mockReturnValueOnce(chain);
  chain.values.mockResolvedValueOnce(undefined);
}

const orgId = '00000000-0000-0000-0000-000000000001';
const userId = '00000000-0000-0000-0000-000000000002';

describe('organization.service permission gates', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetOrgCreatePermission.mockResolvedValue(true);
    mockHasOrgPermission.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createOrganization', () => {
    it('should throw 403 FORBIDDEN when user lacks organization.create.org permission', async () => {
      mockGetOrgCreatePermission.mockResolvedValueOnce(false);

      const { createOrganization } = await import('../organization.service.js');
      await expect(createOrganization('Test Org', userId)).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to create organization',
      });
    });

    it('should create organization and add creator as member', async () => {
      // Mock: generateUniqueSlug - slug lookup (no existing slug)
      setupSelect([]);
      // Mock: insert organizations
      setupInsertChain();
      // Mock: insert creator as member
      setupInsertChain();

      // Mock: select org after creation
      setupSelect([
        {
          id: 'new-org-id',
          name: 'Test Org',
          slug: 'test-org',
          logoUrl: null,
          settings: {},
          trialExpiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]);

      const { createOrganization } = await import('../organization.service.js');
      const result = await createOrganization('Test Org', userId);

      expect(result.organization).toBeDefined();
      // Verify that insert was called for: org, creator member
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getOrganization', () => {
    it('should throw 403 FORBIDDEN when user lacks organization.read permission', async () => {
      // requireMembership lookup
      setupSelect([{ id: orgId }]);
      mockHasOrgPermission.mockResolvedValueOnce(false);

      const { getOrganization } = await import('../organization.service.js');
      await expect(getOrganization(orgId, userId)).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to view this organization',
      });
    });
  });

  describe('updateOrganization', () => {
    it('should throw 403 FORBIDDEN when user lacks organization.update permission', async () => {
      // requireMembership lookup
      setupSelect([{ id: orgId }]);
      mockHasOrgPermission.mockResolvedValueOnce(false);

      const { updateOrganization } = await import('../organization.service.js');
      await expect(updateOrganization(orgId, userId, { name: 'New Name' })).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to update this organization',
      });
    });
  });

  describe('deleteOrganization', () => {
    it('should throw 403 FORBIDDEN when user lacks organization.delete permission', async () => {
      // requireMembership lookup
      setupSelect([{ id: orgId }]);
      mockHasOrgPermission.mockResolvedValueOnce(false);

      const { deleteOrganization } = await import('../organization.service.js');
      await expect(deleteOrganization(orgId, userId)).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to delete this organization',
      });
    });
  });

  describe('uploadOrganizationLogo', () => {
    it('should throw 403 FORBIDDEN when user lacks organization.update permission', async () => {
      // requireMembership lookup
      setupSelect([{ id: orgId }]);
      mockHasOrgPermission.mockResolvedValueOnce(false);

      const { uploadOrganizationLogo } = await import('../organization.service.js');
      await expect(
        uploadOrganizationLogo(orgId, userId, Buffer.from('fake'), 'image/png'),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to update this organization',
      });
    });
  });

  describe('listMembers', () => {
    it('should throw 403 FORBIDDEN when user lacks membership.read permission', async () => {
      // requireMembership lookup
      setupSelect([{ id: orgId }]);
      mockHasOrgPermission.mockResolvedValueOnce(false);

      const { listMembers } = await import('../organization.service.js');
      await expect(listMembers(orgId, userId)).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to view members in this organization',
      });
    });

    it('should succeed when user has membership.read permission', async () => {
      // requireMembership lookup
      setupSelect([{ id: orgId }]);
      // First call: membership.read check → true
      // DB query for members
      setupSelect([
        {
          id: 'member-1',
          organizationId: orgId,
          userId: 'user-1',
          roleId: 'role-1',
          joinedAt: new Date(),
          email: 'user@example.com',
          displayName: 'Test User',
          name: 'Admin',
        },
      ]);
      mockHasOrgPermission.mockResolvedValue(true);

      const { listMembers } = await import('../organization.service.js');
      const result = await listMembers(orgId, userId);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('user@example.com');
      expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'membership', 'read');
    });
  });

  describe('updateMemberRole', () => {
    it('should throw 403 FORBIDDEN when user lacks membership.update permission', async () => {
      // requireMembership lookup
      setupSelect([{ id: orgId }]);
      mockHasOrgPermission.mockResolvedValueOnce(false);

      const { updateMemberRole } = await import('../organization.service.js');
      await expect(updateMemberRole(orgId, userId, 'member-1', 'role-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to update member roles in this organization',
      });
    });

    it('should succeed when user has membership.update permission', async () => {
      // requireMembership lookup
      setupSelect([{ id: orgId }]);
      // membership.update check → true
      // DB query for member
      setupSelect([
        {
          id: 'member-1',
          organizationId: orgId,
          userId: 'target-user-1',
          roleId: 'old-role',
          joinedAt: new Date(),
        },
      ]);
      // DB query for role
      setupSelect([{ id: 'new-role', name: 'Admin', organizationId: orgId }]);
      // DB query for old role
      setupSelect([{ name: 'Member' }]);
      // DB query for last-admin check (hasOrgPermission for organization.manage)
      mockHasOrgPermission.mockResolvedValueOnce(true); // membership.update check passes
      mockHasOrgPermission.mockResolvedValueOnce(false); // target doesn't have manage
      // doesRoleGrantPermission: permissions query
      setupSelect([{ resource: 'organization', action: 'manage', scope: 'org' }]);
      // doesRoleGrantPermission: role org-check query
      setupSelect([{ organizationId: orgId }]);
      // DB update for member role
      setupUpdateChain();
      mockHasOrgPermission.mockResolvedValue(true);

      const { updateMemberRole } = await import('../organization.service.js');
      const result = await updateMemberRole(orgId, userId, 'member-1', 'new-role');

      expect(result.id).toBe('member-1');
      // Verify membership.update permission was checked
      expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'membership', 'update');
    });
  });
});
