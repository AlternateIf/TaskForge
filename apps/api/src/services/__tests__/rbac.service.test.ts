import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSelect,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockLoadPermissionContext,
  mockActivityLog,
} = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockLoadPermissionContext: vi.fn(),
  mockActivityLog: vi.fn(),
}));

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
  organizationMembers: {
    organizationId: 'organizationMembers.organizationId',
    userId: 'organizationMembers.userId',
  },
  permissionAssignments: {
    id: 'permissionAssignments.id',
    userId: 'permissionAssignments.userId',
    organizationId: 'permissionAssignments.organizationId',
    permissionKey: 'permissionAssignments.permissionKey',
    assignedByUserId: 'permissionAssignments.assignedByUserId',
  },
  roleAssignments: {
    id: 'roleAssignments.id',
    userId: 'roleAssignments.userId',
    roleId: 'roleAssignments.roleId',
    organizationId: 'roleAssignments.organizationId',
    assignedByUserId: 'roleAssignments.assignedByUserId',
  },
  roles: {
    id: 'roles.id',
    name: 'roles.name',
    organizationId: 'roles.organizationId',
    description: 'roles.description',
  },
  users: {
    id: 'users.id',
    email: 'users.email',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn((...args: unknown[]) => ({ _type: 'and', args })),
  eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b })),
  isNull: vi.fn((a: unknown) => ({ _type: 'isNull', a })),
  not: vi.fn((a: unknown) => ({ _type: 'not', a })),
  or: vi.fn((...args: unknown[]) => ({ _type: 'or', args })),
}));

vi.mock('../permission.service.js', () => ({
  loadPermissionContext: mockLoadPermissionContext,
}));

vi.mock('../activity.service.js', () => ({
  log: mockActivityLog,
}));

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

describe('rbac.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects role assignment when role scope does not match assignment scope', async () => {
    setupSelectLimit([{ id: 'role-1', name: 'Org Admin', organizationId: 'org-1' }]);

    const rbacService = await import('../rbac.service.js');
    await expect(
      rbacService.createRoleAssignment('actor-1', {
        userId: 'user-1',
        roleId: 'role-1',
        organizationId: null,
      }),
    ).rejects.toThrow('Role scope does not match assignment scope');

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects permission assignment when actor does not hold permission in scope', async () => {
    mockLoadPermissionContext.mockResolvedValue({
      hasSuperAdmin: false,
      effectivePermissions: [],
    });
    setupSelectLimit([]);

    const rbacService = await import('../rbac.service.js');
    await expect(
      rbacService.createPermissionAssignment('actor-1', {
        userId: 'user-2',
        permissionKey: 'role.update.org',
        organizationId: 'org-1',
      }),
    ).rejects.toThrow('Cannot grant a permission the actor does not hold in this scope');
  });

  it('deletes direct permission assignment and writes audit entry', async () => {
    setupSelectLimit([
      {
        id: 'perm-1',
        userId: 'user-2',
        organizationId: 'org-1',
        permissionKey: 'permission.read.org',
      },
    ]);

    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    mockDelete.mockReturnValueOnce({ where: deleteWhere });

    const rbacService = await import('../rbac.service.js');
    await rbacService.deletePermissionAssignment('actor-1', 'perm-1');

    expect(deleteWhere).toHaveBeenCalledTimes(1);
    expect(mockActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        actorId: 'actor-1',
        entityType: 'permission_assignment',
        entityId: 'perm-1',
        action: 'permission_assignment_deleted',
      }),
    );
  });
});
