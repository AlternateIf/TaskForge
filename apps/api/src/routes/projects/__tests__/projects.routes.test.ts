import { beforeEach, describe, expect, it, vi } from 'vitest';
import { projectRoutes } from '../projects.routes.js';

// ─── Hoisted mocks ───────────────────────────────────────────────────────────

const {
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
  mockDbDelete,
  mockDbTransaction,
  mockTxSelect,
  mockTxUpdate,
  mockHasOrgPermission,
  mockCheckPermission,
  mockLoadPermissionContext,
  mockGetOrgIdFromProject,
} = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbDelete: vi.fn(),
  mockDbTransaction: vi.fn(),
  mockTxSelect: vi.fn(),
  mockTxUpdate: vi.fn(),
  mockHasOrgPermission: vi.fn().mockResolvedValue(true),
  mockCheckPermission: vi.fn().mockResolvedValue(true),
  mockLoadPermissionContext: vi.fn().mockResolvedValue({
    orgId: 'org-1',
    userId: 'user-1',
    roles: [],
    directPermissions: [],
  }),
  mockGetOrgIdFromProject: vi.fn().mockResolvedValue('org-1'),
}));

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
    delete: mockDbDelete,
    transaction: mockDbTransaction,
  },
  projects: {
    id: 'projects.id',
    organizationId: 'projects.organizationId',
    name: 'projects.name',
    slug: 'projects.slug',
    description: 'projects.description',
    color: 'projects.color',
    icon: 'projects.icon',
    status: 'projects.status',
    createdBy: 'projects.createdBy',
    createdAt: 'projects.createdAt',
    updatedAt: 'projects.updatedAt',
    deletedAt: 'projects.deletedAt',
  },
  workflows: {
    id: 'workflows.id',
    projectId: 'workflows.projectId',
    isDefault: 'workflows.isDefault',
    name: 'workflows.name',
    createdAt: 'workflows.createdAt',
    updatedAt: 'workflows.updatedAt',
  },
  workflowStatuses: {
    id: 'workflowStatuses.id',
    workflowId: 'workflowStatuses.workflowId',
    name: 'workflowStatuses.name',
    color: 'workflowStatuses.color',
    position: 'workflowStatuses.position',
    isInitial: 'workflowStatuses.isInitial',
    isFinal: 'workflowStatuses.isFinal',
    createdAt: 'workflowStatuses.createdAt',
  },
  tasks: {
    id: 'tasks.id',
    projectId: 'tasks.projectId',
    statusId: 'tasks.statusId',
    deletedAt: 'tasks.deletedAt',
  },
  labels: {
    id: 'labels.id',
    projectId: 'labels.projectId',
    name: 'labels.name',
    color: 'labels.color',
    createdAt: 'labels.createdAt',
  },
  projectMembers: {
    id: 'projectMembers.id',
    projectId: 'projectMembers.projectId',
    userId: 'projectMembers.userId',
    roleId: 'projectMembers.roleId',
    createdAt: 'projectMembers.createdAt',
  },
  roles: { id: 'roles.id', name: 'roles.name', organizationId: 'roles.organizationId' },
  users: {
    id: 'users.id',
    email: 'users.email',
    displayName: 'users.displayName',
    avatarUrl: 'users.avatarUrl',
    deletedAt: 'users.deletedAt',
  },
}));

vi.mock('../../../services/permission.service.js', () => ({
  hasOrgPermission: mockHasOrgPermission,
  loadPermissionContext: mockLoadPermissionContext,
  checkPermission: mockCheckPermission,
  getOrgIdFromProject: mockGetOrgIdFromProject,
  getProjectIdFromTask: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../services/activity.service.js', () => ({
  log: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../services/search.service.js', () => ({
  indexProject: vi.fn().mockResolvedValue(undefined),
  removeProject: vi.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQueryChain(result: unknown = undefined) {
  const chain = Promise.resolve(result) as Promise<unknown> & Record<string, unknown>;
  for (const method of [
    'from',
    'where',
    'limit',
    'orderBy',
    'innerJoin',
    'groupBy',
    'set',
    'values',
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  return chain;
}

/** Build a fake fastify instance that records route registrations. */
function makeFastify() {
  const registered = {
    get: [] as string[],
    post: [] as string[],
    patch: [] as string[],
    delete: [] as string[],
  };
  return {
    authenticate: vi.fn(),
    addHook: vi.fn(),
    get: vi.fn((path: string, _opts?: unknown, _handler?: unknown) => {
      registered.get.push(path);
    }),
    post: vi.fn((path: string, _opts?: unknown, _handler?: unknown) => {
      registered.post.push(path);
    }),
    patch: vi.fn((path: string, _opts?: unknown, _handler?: unknown) => {
      registered.patch.push(path);
    }),
    delete: vi.fn((path: string, _opts?: unknown, _handler?: unknown) => {
      registered.delete.push(path);
    }),
    registered,
  };
}

type RouteCall = [
  string,
  unknown,
  (request: Record<string, unknown>, reply: Record<string, unknown>) => Promise<unknown>,
];

/** Extract the handler from a registered route call. */
function getHandler(calls: unknown[], path: string) {
  const call = calls.find((c) => (c as RouteCall)[0] === path) as RouteCall | undefined;
  return call?.[2];
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const projectId = 'project-uuid';
const orgId = 'org-uuid';
const userId = 'user-uuid';

const activeProject = {
  id: projectId,
  organizationId: orgId,
  name: 'Test Project',
  slug: 'test-project',
  description: null,
  color: null,
  icon: null,
  status: 'active',
  createdBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const archivedProject = { ...activeProject, status: 'archived' };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('projects.routes — finish/archive endpoint registration', () => {
  it('registers POST /api/v1/projects/:id/finish route', async () => {
    const fastify = makeFastify();
    await projectRoutes(fastify as never);

    expect(fastify.registered.post).toContain('/api/v1/projects/:id/finish');
  });

  it('registers POST /api/v1/projects/:id/archive route', async () => {
    const fastify = makeFastify();
    await projectRoutes(fastify as never);

    expect(fastify.registered.post).toContain('/api/v1/projects/:id/archive');
  });
});

describe('projects.routes — finish route authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPermission.mockResolvedValue(true);
    mockLoadPermissionContext.mockResolvedValue({
      orgId,
      userId,
      roles: [],
      directPermissions: [],
    });
    mockGetOrgIdFromProject.mockResolvedValue(orgId);
  });

  it('uses project.update authorize hook for /finish', async () => {
    const fastify = makeFastify();
    await projectRoutes(fastify as never);

    const finishCall = (fastify.post as ReturnType<typeof vi.fn>).mock.calls.find(
      // biome-ignore lint/suspicious/noExplicitAny: mock.calls is loosely typed
      ([p]: any[]) => p === '/api/v1/projects/:id/finish',
    );
    expect(finishCall).toBeDefined();
    if (!finishCall) return;
    const opts = finishCall[1] as Record<string, unknown>;
    expect(opts.preHandler).toBeDefined();
  });

  it('uses project.update authorize hook for /archive', async () => {
    const fastify = makeFastify();
    await projectRoutes(fastify as never);

    const archiveCall = (fastify.post as ReturnType<typeof vi.fn>).mock.calls.find(
      // biome-ignore lint/suspicious/noExplicitAny: mock.calls is loosely typed
      ([p]: any[]) => p === '/api/v1/projects/:id/archive',
    );
    expect(archiveCall).toBeDefined();
    if (!archiveCall) return;
    const opts = archiveCall[1] as Record<string, unknown>;
    expect(opts.preHandler).toBeDefined();
  });
});

describe('projects.routes — /finish handler behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasOrgPermission.mockResolvedValue(true);
    mockCheckPermission.mockResolvedValue(true);
    mockLoadPermissionContext.mockResolvedValue({
      orgId,
      userId,
      roles: [],
      directPermissions: [],
    });
    mockGetOrgIdFromProject.mockResolvedValue(orgId);

    // Default: db.transaction passes a mock tx to the callback
    mockDbTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        select: mockTxSelect,
        update: mockTxUpdate,
      };
      return callback(tx);
    });
    mockTxSelect.mockReset();
    mockTxUpdate.mockReset();
  });

  it('/finish handler returns 200 with project data on success', async () => {
    let selectCount = 0;
    mockDbSelect.mockImplementation(() => {
      selectCount++;
      // 1st: getOrgIdForProject
      if (selectCount === 1) return makeQueryChain([{ orgId }]);
      // 2nd: project lookup
      if (selectCount === 2) return makeQueryChain([activeProject]);
      // 3rd (after tx): getProject after update
      return makeQueryChain([{ ...activeProject, status: 'archived' }]);
    });

    // Transaction-scoped selects: re-read project + hasNonFinalTasks
    let txSelectCount = 0;
    mockTxSelect.mockImplementation(() => {
      txSelectCount++;
      // 1st tx select: re-read project inside tx → active
      if (txSelectCount === 1) return makeQueryChain([activeProject]);
      // 2nd tx select: hasNonFinalTasks via tx → empty
      return makeQueryChain([]);
    });

    const txUpdateChain = makeQueryChain(undefined);
    mockTxUpdate.mockReturnValue(txUpdateChain);

    const fastify = makeFastify();
    await projectRoutes(fastify as never);

    const handler = getHandler(
      (fastify.post as ReturnType<typeof vi.fn>).mock.calls,
      '/api/v1/projects/:id/finish',
    );
    if (!handler) throw new Error('Finish handler not found');

    const mockRequest = {
      authUser: { userId },
      params: { id: projectId },
    };
    const mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    await handler(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(200);
    const sentData = (mockReply.send as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(sentData.data).toBeDefined();
  });

  it('/finish handler returns 422 when blocked by open tasks', async () => {
    let selectCount = 0;
    mockDbSelect.mockImplementation(() => {
      selectCount++;
      // 1st: getOrgIdForProject
      if (selectCount === 1) return makeQueryChain([{ orgId }]);
      // 2nd: project lookup → active project
      if (selectCount === 2) return makeQueryChain([activeProject]);
      return makeQueryChain([]);
    });

    // Transaction-scoped selects
    let txSelectCount = 0;
    mockTxSelect.mockImplementation(() => {
      txSelectCount++;
      // 1st tx select: re-read project inside tx → active
      if (txSelectCount === 1) return makeQueryChain([activeProject]);
      // 2nd tx select: hasNonFinalTasks via tx → has non-final task
      return makeQueryChain([{ id: 'non-final-task-id' }]);
    });

    const fastify = makeFastify();
    await projectRoutes(fastify as never);

    const handler = getHandler(
      (fastify.post as ReturnType<typeof vi.fn>).mock.calls,
      '/api/v1/projects/:id/finish',
    );
    if (!handler) throw new Error('Finish handler not found');

    const mockRequest = {
      authUser: { userId },
      params: { id: projectId },
    };
    const mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    await expect(handler(mockRequest, mockReply)).rejects.toThrow(
      'Finish all open tasks before marking this project as finished.',
    );

    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('/finish handler returns current state (200) when project is already archived', async () => {
    let selectCount = 0;
    mockDbSelect.mockImplementation(() => {
      selectCount++;
      // 1st: getOrgIdForProject
      if (selectCount === 1) return makeQueryChain([{ orgId }]);
      // 2nd: project lookup → already archived
      if (selectCount === 2) return makeQueryChain([archivedProject]);
      // 3rd: getProject (idempotent return path)
      return makeQueryChain([archivedProject]);
    });

    const fastify = makeFastify();
    await projectRoutes(fastify as never);

    const handler = getHandler(
      (fastify.post as ReturnType<typeof vi.fn>).mock.calls,
      '/api/v1/projects/:id/finish',
    );
    if (!handler) throw new Error('Finish handler not found');

    const mockRequest = {
      authUser: { userId },
      params: { id: projectId },
    };
    const mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    await handler(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(200);
    // Transaction should not be entered for idempotent path
    expect(mockDbTransaction).not.toHaveBeenCalled();
  });
});

describe('projects.routes — /archive routes through same validated path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasOrgPermission.mockResolvedValue(true);
    mockCheckPermission.mockResolvedValue(true);
    mockLoadPermissionContext.mockResolvedValue({
      orgId,
      userId,
      roles: [],
      directPermissions: [],
    });
    mockGetOrgIdFromProject.mockResolvedValue(orgId);

    // Default: db.transaction passes a mock tx to the callback
    mockDbTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        select: mockTxSelect,
        update: mockTxUpdate,
      };
      return callback(tx);
    });
    mockTxSelect.mockReset();
    mockTxUpdate.mockReset();
  });

  it('/archive handler returns 422 when blocked by non-final tasks', async () => {
    let selectCount = 0;
    mockDbSelect.mockImplementation(() => {
      selectCount++;
      // 1st: getOrgIdForProject
      if (selectCount === 1) return makeQueryChain([{ orgId }]);
      // 2nd: project lookup → active project
      if (selectCount === 2) return makeQueryChain([activeProject]);
      return makeQueryChain([]);
    });

    // Transaction-scoped selects
    let txSelectCount = 0;
    mockTxSelect.mockImplementation(() => {
      txSelectCount++;
      // 1st tx select: re-read project inside tx → active
      if (txSelectCount === 1) return makeQueryChain([activeProject]);
      // 2nd tx select: hasNonFinalTasks via tx → has non-final task
      return makeQueryChain([{ id: 'non-final-task-id' }]);
    });

    const fastify = makeFastify();
    await projectRoutes(fastify as never);

    const handler = getHandler(
      (fastify.post as ReturnType<typeof vi.fn>).mock.calls,
      '/api/v1/projects/:id/archive',
    );
    if (!handler) throw new Error('Archive handler not found');

    const mockRequest = {
      authUser: { userId },
      params: { id: projectId },
    };
    const mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    await expect(handler(mockRequest, mockReply)).rejects.toThrow(
      'Finish all open tasks before marking this project as finished.',
    );

    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('/archive handler returns 200 when project is already archived', async () => {
    let selectCount = 0;
    mockDbSelect.mockImplementation(() => {
      selectCount++;
      // 1st: getOrgIdForProject
      if (selectCount === 1) return makeQueryChain([{ orgId }]);
      // 2nd: project lookup → already archived
      if (selectCount === 2) return makeQueryChain([archivedProject]);
      // 3rd: getProject (idempotent path)
      return makeQueryChain([archivedProject]);
    });

    const fastify = makeFastify();
    await projectRoutes(fastify as never);

    const handler = getHandler(
      (fastify.post as ReturnType<typeof vi.fn>).mock.calls,
      '/api/v1/projects/:id/archive',
    );
    if (!handler) throw new Error('Archive handler not found');

    const mockRequest = {
      authUser: { userId },
      params: { id: projectId },
    };
    const mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    await handler(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(200);
    // Transaction should not be entered for idempotent path
    expect(mockDbTransaction).not.toHaveBeenCalled();
  });
});
