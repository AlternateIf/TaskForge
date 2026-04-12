import { beforeEach, describe, expect, it, vi } from 'vitest';
import { organizationRoutes } from '../organizations.routes.js';

const {
  mockGetOrgCreatePermission,
  mockHasOrgPermission,
  mockDbSelect,
  mockLoadPermissionContext,
  mockCheckPermission,
} = vi.hoisted(() => ({
  mockGetOrgCreatePermission: vi.fn(),
  mockHasOrgPermission: vi.fn(),
  mockDbSelect: vi.fn(),
  mockLoadPermissionContext: vi.fn(),
  mockCheckPermission: vi.fn(),
}));

vi.mock('@taskforge/db', () => ({
  db: { select: mockDbSelect },
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
    assignedByUserId: 'roleAssignments.assignedByUserId',
    createdAt: 'roleAssignments.createdAt',
    updatedAt: 'roleAssignments.updatedAt',
  },
  roles: {
    id: 'roles.id',
    name: 'roles.name',
    organizationId: 'roles.organizationId',
    createdAt: 'roles.createdAt',
    updatedAt: 'roles.updatedAt',
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
    id: 'permissionAssignments.id',
  },
  users: {
    id: 'users.id',
    email: 'users.email',
    passwordHash: 'users.passwordHash',
    mfaEnabled: 'users.mfaEnabled',
    mfaSecret: 'users.mfaSecret',
    updatedAt: 'users.updatedAt',
    deletedAt: 'users.deletedAt',
  },
}));

vi.mock('../../../services/permission.service.js', () => ({
  getOrgCreatePermission: mockGetOrgCreatePermission,
  hasOrgPermission: mockHasOrgPermission,
  loadPermissionContext: mockLoadPermissionContext,
  checkPermission: mockCheckPermission,
}));

/** Normalize a preHandler value to an array. Fastify accepts both a single function and an array. */
function toArray(
  preHandler: unknown,
): Array<(request: Record<string, unknown>, reply: Record<string, unknown>) => Promise<unknown>> {
  if (!preHandler) return [];
  if (Array.isArray(preHandler))
    return preHandler as Array<
      (request: Record<string, unknown>, reply: Record<string, unknown>) => Promise<unknown>
    >;
  return [preHandler] as Array<
    (request: Record<string, unknown>, reply: Record<string, unknown>) => Promise<unknown>
  >;
}

describe('organizations.routes legacy regression', () => {
  it('does not register the removed legacy member-add-by-email endpoint', async () => {
    const registered = {
      get: [] as string[],
      post: [] as string[],
      patch: [] as string[],
      delete: [] as string[],
    };

    const fastify = {
      authenticate: vi.fn(),
      addHook: vi.fn(),
      get: vi.fn((path: string) => {
        registered.get.push(path);
      }),
      post: vi.fn((path: string) => {
        registered.post.push(path);
      }),
      patch: vi.fn((path: string) => {
        registered.patch.push(path);
      }),
      delete: vi.fn((path: string) => {
        registered.delete.push(path);
      }),
    };

    await organizationRoutes(fastify as never);

    expect(registered.post).toContain('/api/v1/organizations');
    expect(registered.post).not.toContain('/api/v1/organizations/:id/members');
  });
});

describe('organizations.routes permission-matrix endpoint', () => {
  it('registers the GET permission-matrix route', async () => {
    const registered = {
      get: [] as string[],
      post: [] as string[],
      patch: [] as string[],
      delete: [] as string[],
    };

    const fastify = {
      authenticate: vi.fn(),
      addHook: vi.fn(),
      get: vi.fn((path: string) => {
        registered.get.push(path);
      }),
      post: vi.fn((path: string) => {
        registered.post.push(path);
      }),
      patch: vi.fn((path: string) => {
        registered.patch.push(path);
      }),
      delete: vi.fn((path: string) => {
        registered.delete.push(path);
      }),
    };

    await organizationRoutes(fastify as never);

    expect(registered.get).toContain('/api/v1/organizations/:id/permission-matrix');
  });

  it('uses authorize hook for permission-matrix route', async () => {
    const fastify = {
      authenticate: vi.fn(),
      addHook: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    await organizationRoutes(fastify as never);

    const getCall = (fastify.get as ReturnType<typeof vi.fn>).mock.calls.find(
      ([p]) => p === '/api/v1/organizations/:id/permission-matrix',
    );
    const preHandler = getCall?.[1]?.preHandler;

    expect(preHandler).toBeDefined();
  });
});

describe('organizations.routes permission-matrix authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated on permission-matrix', async () => {
    const registered = {
      get: [] as string[],
      post: [] as string[],
      patch: [] as string[],
      delete: [] as string[],
    };
    const fastify = {
      authenticate: vi.fn(),
      addHook: vi.fn(),
      get: vi.fn((path: string) => {
        registered.get.push(path);
      }),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    await organizationRoutes(fastify as never);

    const getCall = (fastify.get as ReturnType<typeof vi.fn>).mock.calls.find(
      ([p]) => p === '/api/v1/organizations/:id/permission-matrix',
    );
    const preHandlers = toArray(getCall?.[1]?.preHandler);

    const mockRequest = {
      authUser: undefined,
      params: { id: 'org-1' },
      permissionContext: undefined,
    };
    const mockReply = {};

    let preHandlerError: unknown = null;
    for (const handler of preHandlers) {
      try {
        await handler(mockRequest, mockReply);
      } catch (err) {
        preHandlerError = err;
        break;
      }
    }

    expect(preHandlerError).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('returns 403 when user lacks role.read.org permission', async () => {
    mockLoadPermissionContext.mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-1',
      roles: [],
      directPermissions: [],
    });
    mockCheckPermission.mockResolvedValue(false);

    const registered = {
      get: [] as string[],
      post: [] as string[],
      patch: [] as string[],
      delete: [] as string[],
    };
    const fastify = {
      authenticate: vi.fn(),
      addHook: vi.fn(),
      get: vi.fn((path: string) => {
        registered.get.push(path);
      }),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    await organizationRoutes(fastify as never);

    const getCall = (fastify.get as ReturnType<typeof vi.fn>).mock.calls.find(
      ([p]) => p === '/api/v1/organizations/:id/permission-matrix',
    );
    const preHandlers = toArray(getCall?.[1]?.preHandler);

    const mockRequest = {
      authUser: { userId: 'user-1' },
      params: { id: 'org-1' },
      permissionContext: undefined,
    };
    const mockReply = {};

    let preHandlerError: unknown = null;
    for (const handler of preHandlers) {
      try {
        await handler(mockRequest, mockReply);
      } catch (err) {
        preHandlerError = err;
        break;
      }
    }

    expect(preHandlerError).toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('proceeds when user has role.read.org permission', async () => {
    mockLoadPermissionContext.mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-1',
      roles: [
        {
          id: 'role-1',
          name: 'Admin',
          permissions: [{ resource: 'role', action: 'read', scope: 'org' }],
        },
      ],
      directPermissions: [],
    });
    mockCheckPermission.mockResolvedValue(true);

    const registered = {
      get: [] as string[],
      post: [] as string[],
      patch: [] as string[],
      delete: [] as string[],
    };
    const fastify = {
      authenticate: vi.fn(),
      addHook: vi.fn(),
      get: vi.fn((path: string) => {
        registered.get.push(path);
      }),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    await organizationRoutes(fastify as never);

    const getCall = (fastify.get as ReturnType<typeof vi.fn>).mock.calls.find(
      ([p]) => p === '/api/v1/organizations/:id/permission-matrix',
    );
    const preHandlers = toArray(getCall?.[1]?.preHandler);

    const mockRequest = {
      authUser: { userId: 'user-1' },
      params: { id: 'org-1' },
      permissionContext: undefined,
    };
    const mockReply = {};

    let preHandlerError: unknown = null;
    for (const handler of preHandlers) {
      try {
        await handler(mockRequest, mockReply);
      } catch (err) {
        preHandlerError = err;
        break;
      }
    }

    expect(preHandlerError).toBeNull();
  });

  it('calls loadPermissionContext with correct userId and orgId', async () => {
    mockLoadPermissionContext.mockResolvedValue({
      orgId: 'org-1',
      userId: 'user-1',
      roles: [],
      directPermissions: [],
    });
    mockCheckPermission.mockResolvedValue(true);

    const registered = {
      get: [] as string[],
      post: [] as string[],
      patch: [] as string[],
      delete: [] as string[],
    };
    const fastify = {
      authenticate: vi.fn(),
      addHook: vi.fn(),
      get: vi.fn((path: string) => {
        registered.get.push(path);
      }),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    await organizationRoutes(fastify as never);

    const getCall = (fastify.get as ReturnType<typeof vi.fn>).mock.calls.find(
      ([p]) => p === '/api/v1/organizations/:id/permission-matrix',
    );
    const preHandlers = toArray(getCall?.[1]?.preHandler);

    const mockRequest = {
      authUser: { userId: 'user-1' },
      params: { id: 'org-1' },
      permissionContext: undefined,
    };
    const mockReply = {};

    for (const handler of preHandlers) {
      try {
        await handler(mockRequest, mockReply);
      } catch {
        // ignore
      }
    }

    expect(mockLoadPermissionContext).toHaveBeenCalledWith('user-1', 'org-1');
  });
});

describe('organizations.routes GET /api/v1/organizations permission gate', () => {
  let registered: { get: string[]; post: string[]; patch: string[]; delete: string[] };

  beforeEach(() => {
    vi.clearAllMocks();
    registered = { get: [], post: [], patch: [], delete: [] };

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
  });

  it('proceeds for authenticated user — org listing is membership-based, no permission gate at route level', async () => {
    // The list endpoint no longer checks permissions at the route level.
    // Permission filtering is done in the service layer (listUserOrganizations).
    const fastify = {
      authenticate: vi.fn(),
      addHook: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    await organizationRoutes(fastify as never);

    const getCall = (fastify.get as ReturnType<typeof vi.fn>).mock.calls.find(
      ([p]) => p === '/api/v1/organizations',
    );
    const preHandlers = toArray(getCall?.[1]?.preHandler);

    const mockRequest = { authUser: { userId: 'user-1' } };
    const mockReply = {};

    let preHandlerError: unknown = null;
    for (const handler of preHandlers) {
      try {
        await handler(mockRequest, mockReply);
      } catch (err) {
        preHandlerError = err;
        break;
      }
    }

    // Route-level auth only checks authentication, not permissions
    expect(preHandlerError).toBeNull();
  });

  it('returns 401 when user is not authenticated', async () => {
    const fastify = {
      authenticate: vi.fn(),
      addHook: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    await organizationRoutes(fastify as never);

    const getCall = (fastify.get as ReturnType<typeof vi.fn>).mock.calls.find(
      ([p]) => p === '/api/v1/organizations',
    );
    const preHandlers = toArray(getCall?.[1]?.preHandler);

    const mockRequest = { authUser: undefined };
    const mockReply = {};

    let preHandlerError: unknown = null;
    for (const handler of preHandlers) {
      try {
        await handler(mockRequest, mockReply);
      } catch (err) {
        preHandlerError = err;
        break;
      }
    }

    expect(preHandlerError).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });
});
