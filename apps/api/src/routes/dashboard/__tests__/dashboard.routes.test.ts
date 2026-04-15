import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardRoutes } from '../dashboard.routes.js';

// ─── Hoisted mocks ───────────────────────────────────────────────────────────

const {
  mockGetMyTasks,
  mockGetUpcomingTasks,
  mockGetProjectProgress,
  mockGetDashboardSummary,
  mockCheckPermission,
  mockLoadPermissionContext,
} = vi.hoisted(() => ({
  mockGetMyTasks: vi.fn(),
  mockGetUpcomingTasks: vi.fn(),
  mockGetProjectProgress: vi.fn(),
  mockGetDashboardSummary: vi.fn(),
  mockCheckPermission: vi.fn().mockResolvedValue(true),
  mockLoadPermissionContext: vi.fn().mockResolvedValue({
    orgId: 'org-1',
    userId: 'user-1',
    roles: [],
    directPermissions: [],
  }),
}));

vi.mock('../../../services/dashboard.service.js', () => ({
  getMyTasks: (...args: unknown[]) => mockGetMyTasks(...args),
  getUpcomingTasks: (...args: unknown[]) => mockGetUpcomingTasks(...args),
  getProjectProgress: (...args: unknown[]) => mockGetProjectProgress(...args),
  getDashboardSummary: (...args: unknown[]) => mockGetDashboardSummary(...args),
}));

vi.mock('../../../services/permission.service.js', () => ({
  hasOrgPermission: vi.fn().mockResolvedValue(true),
  loadPermissionContext: mockLoadPermissionContext,
  checkPermission: mockCheckPermission,
  getOrgIdFromProject: vi.fn().mockResolvedValue('org-1'),
  getProjectIdFromTask: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../utils/errors.js', () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    code: string;
    constructor(statusCode: number, code: string, message: string) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
    }
  },
  ErrorCode: {
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    BAD_REQUEST: 'BAD_REQUEST',
  },
}));

vi.mock('../../../utils/response.js', () => ({
  success: (data: unknown) => ({ data }),
  paginated: (items: unknown[], cursor: string | null, hasMore: boolean, totalCount?: number) => ({
    data: items,
    meta: { cursor, hasMore, totalCount },
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const ORG_ID = 'org-1';
const USER_ID = 'user-1';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------
describe('dashboard.routes', () => {
  it('registers all dashboard routes', async () => {
    const fastify = makeFastify();
    await dashboardRoutes(fastify as never);

    expect(fastify.addHook).toHaveBeenCalledWith('preHandler', fastify.authenticate);
    expect(fastify.registered.get).toContain(
      '/api/v1/organizations/:orgId/dashboard/tasks/my-tasks',
    );
    expect(fastify.registered.get).toContain(
      '/api/v1/organizations/:orgId/dashboard/tasks/upcoming',
    );
    expect(fastify.registered.get).toContain(
      '/api/v1/organizations/:orgId/dashboard/projects/progress',
    );
    expect(fastify.registered.get).toContain('/api/v1/organizations/:orgId/dashboard/summary');
  });

  it('registers 4 GET routes total', async () => {
    const fastify = makeFastify();
    await dashboardRoutes(fastify as never);

    expect(fastify.registered.get).toHaveLength(4);
    expect(fastify.registered.post).toHaveLength(0);
    expect(fastify.registered.patch).toHaveLength(0);
    expect(fastify.registered.delete).toHaveLength(0);
  });

  it('adds authorize preHandler on all routes', async () => {
    const fastify = makeFastify();
    await dashboardRoutes(fastify as never);

    const getCalls = (fastify.get as ReturnType<typeof vi.fn>).mock.calls;
    for (const call of getCalls) {
      const opts = call[1] as { preHandler: unknown } | undefined;
      expect(opts).toBeDefined();
      expect(opts?.preHandler).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Handler tests — using type assertions that match handler parameter types
// ---------------------------------------------------------------------------
describe('dashboard.handlers — getMyTasksHandler', () => {
  it('calls getMyTasks and returns paginated response', async () => {
    mockGetMyTasks.mockResolvedValueOnce({
      items: [
        {
          id: 'task-1',
          title: 'Task 1',
          projectName: 'Project A',
          projectColor: '#2563eb',
          priority: 'high',
          dueDate: '2026-04-20T00:00:00.000Z',
        },
      ],
      cursor: null,
      hasMore: false,
      totalCount: 1,
    });

    const { getMyTasksHandler } = await import('../dashboard.handlers.js');

    const request = {
      authUser: { userId: USER_ID },
      params: { orgId: ORG_ID },
      query: { limit: '50' },
    } as unknown as Parameters<typeof getMyTasksHandler>[0];

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as Parameters<typeof getMyTasksHandler>[1];

    await getMyTasksHandler(request, reply);

    expect(mockGetMyTasks).toHaveBeenCalledWith(ORG_ID, USER_ID, {
      limit: 50,
      cursor: undefined,
    });
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ id: 'task-1', title: 'Task 1' })]),
      }),
    );
  });

  it('throws 401 when not authenticated', async () => {
    const { getMyTasksHandler } = await import('../dashboard.handlers.js');

    const request = {
      authUser: undefined,
      params: { orgId: ORG_ID },
      query: {},
    } as unknown as Parameters<typeof getMyTasksHandler>[0];

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as Parameters<typeof getMyTasksHandler>[1];

    await expect(getMyTasksHandler(request, reply)).rejects.toThrow('Not authenticated');
  });

  it('passes cursor parameter when provided', async () => {
    mockGetMyTasks.mockResolvedValueOnce({
      items: [],
      cursor: null,
      hasMore: false,
      totalCount: 0,
    });

    const { getMyTasksHandler } = await import('../dashboard.handlers.js');

    const request = {
      authUser: { userId: USER_ID },
      params: { orgId: ORG_ID },
      query: { limit: '25', cursor: 'abc123' },
    } as unknown as Parameters<typeof getMyTasksHandler>[0];

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as Parameters<typeof getMyTasksHandler>[1];

    await getMyTasksHandler(request, reply);

    expect(mockGetMyTasks).toHaveBeenCalledWith(ORG_ID, USER_ID, {
      limit: 25,
      cursor: 'abc123',
    });
  });
});

describe('dashboard.handlers — getUpcomingTasksHandler', () => {
  it('calls getUpcomingTasks and returns success response', async () => {
    mockGetUpcomingTasks.mockResolvedValueOnce({
      weekStart: '2026-04-13',
      weekEnd: '2026-04-19',
      days: [{ date: '2026-04-13', dayLabel: 'Monday', tasks: [], totalTaskCount: 0 }],
    });

    const { getUpcomingTasksHandler } = await import('../dashboard.handlers.js');

    const request = {
      authUser: { userId: USER_ID },
      params: { orgId: ORG_ID },
      query: { weekOffset: '0' },
    } as unknown as Parameters<typeof getUpcomingTasksHandler>[0];

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as Parameters<typeof getUpcomingTasksHandler>[1];

    await getUpcomingTasksHandler(request, reply);

    expect(mockGetUpcomingTasks).toHaveBeenCalledWith(ORG_ID, USER_ID, { weekOffset: 0 });
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          weekStart: '2026-04-13',
        }),
      }),
    );
  });

  it('defaults weekOffset to 0 when not provided', async () => {
    mockGetUpcomingTasks.mockResolvedValueOnce({
      weekStart: '2026-04-13',
      weekEnd: '2026-04-19',
      days: [],
    });

    const { getUpcomingTasksHandler } = await import('../dashboard.handlers.js');

    const request = {
      authUser: { userId: USER_ID },
      params: { orgId: ORG_ID },
      query: {},
    } as unknown as Parameters<typeof getUpcomingTasksHandler>[0];

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as Parameters<typeof getUpcomingTasksHandler>[1];

    await getUpcomingTasksHandler(request, reply);

    expect(mockGetUpcomingTasks).toHaveBeenCalledWith(ORG_ID, USER_ID, { weekOffset: 0 });
  });
});

describe('dashboard.handlers — getProjectProgressHandler', () => {
  it('calls getProjectProgress and returns paginated response', async () => {
    mockGetProjectProgress.mockResolvedValueOnce({
      items: [
        {
          id: 'proj-1',
          name: 'Project A',
          color: '#2563eb',
          progress: 65,
          totalTasks: 10,
          completedTasks: 6,
        },
      ],
      cursor: null,
      hasMore: false,
      totalCount: 1,
    });

    const { getProjectProgressHandler } = await import('../dashboard.handlers.js');

    const request = {
      authUser: { userId: USER_ID },
      params: { orgId: ORG_ID },
      query: { limit: '10' },
    } as unknown as Parameters<typeof getProjectProgressHandler>[0];

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as Parameters<typeof getProjectProgressHandler>[1];

    await getProjectProgressHandler(request, reply);

    expect(mockGetProjectProgress).toHaveBeenCalledWith(ORG_ID, USER_ID, {
      limit: 10,
      cursor: undefined,
    });
    expect(reply.status).toHaveBeenCalledWith(200);
  });

  it('defaults limit to 10 when not provided', async () => {
    mockGetProjectProgress.mockResolvedValueOnce({
      items: [],
      cursor: null,
      hasMore: false,
      totalCount: 0,
    });

    const { getProjectProgressHandler } = await import('../dashboard.handlers.js');

    const request = {
      authUser: { userId: USER_ID },
      params: { orgId: ORG_ID },
      query: {},
    } as unknown as Parameters<typeof getProjectProgressHandler>[0];

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as Parameters<typeof getProjectProgressHandler>[1];

    await getProjectProgressHandler(request, reply);

    expect(mockGetProjectProgress).toHaveBeenCalledWith(ORG_ID, USER_ID, {
      limit: 10,
      cursor: undefined,
    });
  });
});

describe('dashboard.handlers — getSummaryHandler', () => {
  it('calls getDashboardSummary and returns success response', async () => {
    mockGetDashboardSummary.mockResolvedValueOnce({
      myTasksCount: 12,
      overdueTasksCount: 3,
      upcomingTasksCount: 5,
      activeProjectsCount: 2,
      completedTasksThisWeek: 4,
    });

    const { getSummaryHandler } = await import('../dashboard.handlers.js');

    const request = {
      authUser: { userId: USER_ID },
      params: { orgId: ORG_ID },
    } as unknown as Parameters<typeof getSummaryHandler>[0];

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as Parameters<typeof getSummaryHandler>[1];

    await getSummaryHandler(request, reply);

    expect(mockGetDashboardSummary).toHaveBeenCalledWith(ORG_ID, USER_ID);
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          myTasksCount: 12,
          overdueTasksCount: 3,
        }),
      }),
    );
  });

  it('throws 401 when not authenticated', async () => {
    const { getSummaryHandler } = await import('../dashboard.handlers.js');

    const request = {
      authUser: undefined,
      params: { orgId: ORG_ID },
    } as unknown as Parameters<typeof getSummaryHandler>[0];

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as Parameters<typeof getSummaryHandler>[1];

    await expect(getSummaryHandler(request, reply)).rejects.toThrow('Not authenticated');
  });
});
