import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbSelect = vi.fn();

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockDbSelect,
  },
  permissionAssignments: {
    userId: 'permissionAssignments.userId',
    organizationId: 'permissionAssignments.organizationId',
    permissionKey: 'permissionAssignments.permissionKey',
    id: 'permissionAssignments.id',
  },
  permissions: {
    roleId: 'permissions.roleId',
    resource: 'permissions.resource',
    action: 'permissions.action',
    scope: 'permissions.scope',
  },
  projectMembers: {
    projectId: 'projectMembers.projectId',
    userId: 'projectMembers.userId',
    roleId: 'projectMembers.roleId',
  },
  projects: {
    id: 'projects.id',
    organizationId: 'projects.organizationId',
  },
  roleAssignments: {
    userId: 'roleAssignments.userId',
    roleId: 'roleAssignments.roleId',
    organizationId: 'roleAssignments.organizationId',
    id: 'roleAssignments.id',
  },
  roles: {
    id: 'roles.id',
    name: 'roles.name',
  },
  tasks: {
    id: 'tasks.id',
    projectId: 'tasks.projectId',
  },
}));

const { checkPermission, getEffectivePermissions, hasOrgPermission } = await import(
  '../permission.service.js'
);

function makeQueryChain(result: unknown = undefined) {
  const chain = Promise.resolve(result) as Promise<unknown> & Record<string, unknown>;
  for (const method of ['from', 'where', 'limit', 'innerJoin']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  return chain;
}

describe('permission.service checkPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows explicit org-level task.read permission', async () => {
    const ctx = {
      orgId: 'org-1',
      hasSuperAdmin: false,
      effectivePermissions: [{ resource: 'task', action: 'read', scope: 'organization' }],
      projectCache: new Map(),
    };

    const allowed = await checkPermission(ctx, 'user-1', 'task', 'read');
    expect(allowed).toBe(true);
  });

  it('denies when neither project-level nor org-level permission exists', async () => {
    const ctx = {
      orgId: 'org-1',
      hasSuperAdmin: false,
      effectivePermissions: [{ resource: 'organization', action: 'read', scope: 'organization' }],
      projectCache: new Map(),
    };

    const allowed = await checkPermission(ctx, 'user-1', 'task', 'read');
    expect(allowed).toBe(false);
  });

  it('allows project-level permission override', async () => {
    mockDbSelect
      .mockImplementationOnce(() => makeQueryChain([{ roleId: 'role-project' }]))
      .mockImplementationOnce(() => makeQueryChain([{ name: 'Project Member' }]))
      .mockImplementationOnce(() =>
        makeQueryChain([{ resource: 'task', action: 'read', scope: 'organization' }]),
      );

    const ctx = {
      orgId: 'org-1',
      hasSuperAdmin: false,
      effectivePermissions: [],
      projectCache: new Map(),
    };

    const allowed = await checkPermission(ctx, 'user-1', 'task', 'read', 'project-1');
    expect(allowed).toBe(true);
  });

  it('falls back to explicit org permission when project role lacks it', async () => {
    mockDbSelect
      .mockImplementationOnce(() => makeQueryChain([{ roleId: 'role-project' }]))
      .mockImplementationOnce(() => makeQueryChain([{ name: 'Project Member' }]))
      .mockImplementationOnce(() => makeQueryChain([]));

    const ctx = {
      orgId: 'org-1',
      hasSuperAdmin: false,
      effectivePermissions: [{ resource: 'task', action: 'read', scope: 'organization' }],
      projectCache: new Map(),
    };

    const allowed = await checkPermission(ctx, 'user-1', 'task', 'read', 'project-1');
    expect(allowed).toBe(true);
  });

  it('denies when project role lacks permission and org permissions lack it', async () => {
    mockDbSelect
      .mockImplementationOnce(() => makeQueryChain([{ roleId: 'role-project' }]))
      .mockImplementationOnce(() => makeQueryChain([{ name: 'Project Member' }]))
      .mockImplementationOnce(() => makeQueryChain([]));

    const ctx = {
      orgId: 'org-1',
      hasSuperAdmin: false,
      effectivePermissions: [{ resource: 'organization', action: 'read', scope: 'organization' }],
      projectCache: new Map(),
    };

    const allowed = await checkPermission(ctx, 'user-1', 'task', 'read', 'project-1');
    expect(allowed).toBe(false);
  });

  it('allows everything for super admin', async () => {
    const ctx = {
      orgId: 'org-1',
      hasSuperAdmin: true,
      effectivePermissions: [],
      projectCache: new Map(),
    };

    const allowed = await checkPermission(ctx, 'user-1', 'task', 'delete', 'project-1');
    expect(allowed).toBe(true);
  });
});

describe('permission.service getEffectivePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns effective permissions with role-based and direct sources', async () => {
    // Mock role assignments query
    mockDbSelect
      .mockImplementationOnce(() => {
        return makeQueryChain([
          {
            assignmentId: 'ra-1',
            roleId: 'role-admin',
            roleName: 'Admin',
            assignmentOrgId: 'org-1',
          },
        ]);
      })
      // Mock role permissions query
      .mockImplementationOnce(() => {
        return makeQueryChain([
          {
            roleId: 'role-admin',
            resource: 'organization',
            action: 'manage',
            scope: 'organization',
          },
          { roleId: 'role-admin', resource: 'task', action: 'read', scope: 'organization' },
        ]);
      })
      // Mock direct permission assignments query
      .mockImplementationOnce(() => {
        return makeQueryChain([{ id: 'pa-1', permissionKey: 'project.create.org' }]);
      });

    const result = await getEffectivePermissions('user-1', 'org-1');

    expect(result.userId).toBe('user-1');
    expect(result.organizationId).toBe('org-1');
    expect(result.isSuperAdmin).toBe(false);
    expect(result.roles).toEqual([
      { roleId: 'role-admin', roleName: 'Admin', scope: 'organization' },
    ]);
    expect(result.permissions.length).toBeGreaterThanOrEqual(3);

    const orgManagePerm = result.permissions.find(
      (p) => p.key === 'organization.manage.organization',
    );
    expect(orgManagePerm).toBeDefined();
    if (orgManagePerm) {
      expect(orgManagePerm.sources.some((s) => s.type === 'role')).toBe(true);
    }

    const projectCreatePerm = result.permissions.find(
      (p) => p.key === 'project.create.organization',
    );
    expect(projectCreatePerm).toBeDefined();
    if (projectCreatePerm) {
      expect(projectCreatePerm.sources.some((s) => s.type === 'direct')).toBe(true);
    }
  });

  it('returns isSuperAdmin true when user has Super Admin role', async () => {
    mockDbSelect
      .mockImplementationOnce(() => {
        return makeQueryChain([
          {
            assignmentId: 'ra-super',
            roleId: 'role-super',
            roleName: 'Super Admin',
            assignmentOrgId: null,
          },
        ]);
      })
      .mockImplementationOnce(() => {
        return makeQueryChain([]);
      })
      .mockImplementationOnce(() => {
        return makeQueryChain([]);
      });

    const result = await getEffectivePermissions('user-1', 'org-1');

    expect(result.isSuperAdmin).toBe(true);
  });
});

describe('permission.service hasOrgPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when user has manage permission and action is create', async () => {
    mockDbSelect
      .mockImplementationOnce(() => {
        return makeQueryChain([{ roleId: 'role-1', roleName: 'Admin' }]);
      })
      .mockImplementationOnce(() => {
        return makeQueryChain([
          { resource: 'organization', action: 'manage', scope: 'organization' },
        ]);
      })
      .mockImplementationOnce(() => {
        return makeQueryChain([]);
      });

    const result = await hasOrgPermission('user-1', 'org-1', 'organization', 'create');
    expect(result).toBe(true);
  });

  it('returns false when user has no matching permission', async () => {
    mockDbSelect
      .mockImplementationOnce(() => {
        return makeQueryChain([{ roleId: 'role-1', roleName: 'Guest' }]);
      })
      .mockImplementationOnce(() => {
        return makeQueryChain([
          { resource: 'organization', action: 'read', scope: 'organization' },
        ]);
      })
      .mockImplementationOnce(() => {
        return makeQueryChain([]);
      });

    const result = await hasOrgPermission('user-1', 'org-1', 'organization', 'manage');
    expect(result).toBe(false);
  });
});
