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

const { checkPermission } = await import('../permission.service.js');

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
