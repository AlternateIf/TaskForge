import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbSelect = vi.fn();

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockDbSelect,
  },
  organizationMembers: {
    organizationId: 'organizationMembers.organizationId',
    userId: 'organizationMembers.userId',
    roleId: 'organizationMembers.roleId',
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

describe('permission.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows project read from organization.read under MVP-044 governance mapping', async () => {
    const ctx = {
      orgId: 'org-1',
      orgRoleName: 'Organization Admin',
      orgRoleId: 'role-1',
      orgPermissions: [{ resource: 'organization', action: 'read', scope: 'organization' }],
      projectCache: new Map(),
    };

    const allowed = await checkPermission(ctx, 'user-1', 'project', 'read');
    expect(allowed).toBe(true);
  });

  it('does not grant project update from organization.read', async () => {
    const ctx = {
      orgId: 'org-1',
      orgRoleName: 'Organization Admin',
      orgRoleId: 'role-1',
      orgPermissions: [{ resource: 'organization', action: 'read', scope: 'organization' }],
      projectCache: new Map(),
    };

    const allowed = await checkPermission(ctx, 'user-1', 'project', 'update');
    expect(allowed).toBe(false);
  });

  it('grants project update from organization.update under MVP-044 governance mapping', async () => {
    const ctx = {
      orgId: 'org-1',
      orgRoleName: 'Organization Admin',
      orgRoleId: 'role-1',
      orgPermissions: [{ resource: 'organization', action: 'update', scope: 'organization' }],
      projectCache: new Map(),
    };

    const allowed = await checkPermission(ctx, 'user-1', 'project', 'update');
    expect(allowed).toBe(true);
  });

  it('falls back to governance mapping even with project membership override', async () => {
    mockDbSelect
      .mockImplementationOnce(() => makeQueryChain([{ roleId: 'role-project' }]))
      .mockImplementationOnce(() => makeQueryChain([{ name: 'Organization Admin' }]))
      .mockImplementationOnce(() =>
        makeQueryChain([{ resource: 'organization', action: 'update', scope: 'organization' }]),
      );

    const ctx = {
      orgId: 'org-1',
      orgRoleName: 'Organization Admin',
      orgRoleId: 'role-org',
      orgPermissions: [{ resource: 'organization', action: 'update', scope: 'organization' }],
      projectCache: new Map(),
    };

    const allowed = await checkPermission(ctx, 'user-1', 'project', 'update', 'project-1');
    expect(allowed).toBe(true);
  });
});
