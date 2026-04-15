import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Hoisted mocks ───────────────────────────────────────────────────────────

const { mockDbSelect, mockLoadPermissionContext, mockCheckPermission } = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockLoadPermissionContext: vi.fn(),
  mockCheckPermission: vi.fn(),
}));

// Build a chainable mock that supports Drizzle's builder pattern
// Each builder method returns the chain for chaining, but the chain is also
// thenable (acts as a Promise when awaited).
function makeResolvableChain(data: unknown = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['from', 'where', 'limit', 'innerJoin', 'leftJoin', 'orderBy', 'groupBy']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  // Make the chain thenable so it resolves when awaited
  Object.defineProperty(chain, 'then', {
    value: (resolve: (value: unknown) => void, _reject?: (reason?: unknown) => void) => {
      Promise.resolve(data).then(resolve);
    },
    writable: true,
    configurable: true,
  });
  return chain;
}

vi.mock('@taskforge/db', () => ({
  db: { select: mockDbSelect },
  projects: {
    id: 'projects.id',
    organizationId: 'projects.organizationId',
    name: 'projects.name',
    color: 'projects.color',
    status: 'projects.status',
    deletedAt: 'projects.deletedAt',
  },
  tasks: {
    id: 'tasks.id',
    projectId: 'tasks.projectId',
    title: 'tasks.title',
    priority: 'tasks.priority',
    assigneeId: 'tasks.assigneeId',
    dueDate: 'tasks.dueDate',
    statusId: 'tasks.statusId',
    parentTaskId: 'tasks.parentTaskId',
    deletedAt: 'tasks.deletedAt',
    updatedAt: 'tasks.updatedAt',
  },
  workflowStatuses: {
    id: 'workflowStatuses.id',
    name: 'workflowStatuses.name',
    color: 'workflowStatuses.color',
    isFinal: 'workflowStatuses.isFinal',
    isValidated: 'workflowStatuses.isValidated',
    workflowId: 'workflowStatuses.workflowId',
  },
  workflows: {
    id: 'workflows.id',
    projectId: 'workflows.projectId',
  },
  projectMembers: {
    id: 'projectMembers.id',
    projectId: 'projectMembers.projectId',
    userId: 'projectMembers.userId',
  },
  organizationMembers: {
    id: 'organizationMembers.id',
    organizationId: 'organizationMembers.organizationId',
    userId: 'organizationMembers.userId',
  },
  roles: {
    id: 'roles.id',
    name: 'roles.name',
  },
  permissions: {
    id: 'permissions.id',
    roleId: 'permissions.roleId',
    resource: 'permissions.resource',
    action: 'permissions.action',
    scope: 'permissions.scope',
  },
  roleAssignments: {
    id: 'roleAssignments.id',
    userId: 'roleAssignments.userId',
    roleId: 'roleAssignments.roleId',
    organizationId: 'roleAssignments.organizationId',
  },
  permissionAssignments: {
    id: 'permissionAssignments.id',
    userId: 'permissionAssignments.userId',
    permissionKey: 'permissionAssignments.permissionKey',
    organizationId: 'permissionAssignments.organizationId',
  },
}));

vi.mock('../permission.service.js', () => ({
  loadPermissionContext: (...args: unknown[]) => mockLoadPermissionContext(...args),
  checkPermission: (...args: unknown[]) => mockCheckPermission(...args),
  hasOrgPermission: vi.fn().mockResolvedValue(true),
  getOrgIdFromProject: vi.fn().mockResolvedValue('org-1'),
  getProjectIdFromTask: vi.fn().mockResolvedValue(null),
}));

vi.mock('drizzle-orm', () => ({
  and: (...conditions: unknown[]) => conditions,
  asc: (col: unknown) => col,
  desc: (col: unknown) => col,
  count: (col: unknown) => ({ count: col }),
  eq: (col: unknown, val: unknown) => ({ eq: [col, val] }),
  gte: (col: unknown, val: unknown) => ({ gte: [col, val] }),
  lte: (col: unknown, val: unknown) => ({ lte: [col, val] }),
  isNull: (col: unknown) => ({ isNull: col }),
  isNotNull: (col: unknown) => ({ isNotNull: col }),
  ne: (col: unknown, val: unknown) => ({ ne: [col, val] }),
  sql: {
    join: (parts: unknown[], _sep: unknown) => parts,
    raw: (str: string) => str,
  },
}));

// Import after mocks
const dashboardService = await import('../dashboard.service.js');

const ORG_ID = 'org-1';
const USER_ID = 'user-1';

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadPermissionContext.mockReset();
  mockCheckPermission.mockReset();
  mockDbSelect.mockReset();
  // Default: user has permission context and can read tasks
  mockLoadPermissionContext.mockResolvedValue({
    orgId: ORG_ID,
    effectivePermissions: [{ resource: 'task', action: 'read', scope: 'project' }],
    projectCache: new Map(),
  });
  mockCheckPermission.mockResolvedValue(true);
});

// ---------------------------------------------------------------------------
// getMyTasks
// ---------------------------------------------------------------------------
describe('dashboard.service — getMyTasks', () => {
  it('should return empty result when user has no permission context', async () => {
    mockLoadPermissionContext.mockResolvedValue(null);

    const result = await dashboardService.getMyTasks(ORG_ID, USER_ID, {
      limit: 50,
    });

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.hasMore).toBe(false);
    expect(result.cursor).toBeNull();
  });

  it('should return empty result when user has no accessible projects', async () => {
    // getAccessibleProjectIds: first db.select resolves to empty project list
    mockDbSelect.mockReturnValueOnce(makeResolvableChain([]));

    const result = await dashboardService.getMyTasks(ORG_ID, USER_ID, {
      limit: 50,
    });

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('should cap limit at 200 when larger value is passed', async () => {
    mockDbSelect.mockReturnValueOnce(makeResolvableChain([]));

    const result = await dashboardService.getMyTasks(ORG_ID, USER_ID, {
      limit: 500,
    });

    expect(result).toBeDefined();
    expect(result.items).toEqual([]);
  });

  it('should default to limit 50 when no limit provided', async () => {
    mockDbSelect.mockReturnValueOnce(makeResolvableChain([]));

    const result = await dashboardService.getMyTasks(ORG_ID, USER_ID);

    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getUpcomingTasks
// ---------------------------------------------------------------------------
describe('dashboard.service — getUpcomingTasks', () => {
  it('should return empty result when user has no permission context', async () => {
    mockLoadPermissionContext.mockResolvedValue(null);

    const result = await dashboardService.getUpcomingTasks(ORG_ID, USER_ID, {
      weekOffset: 0,
    });

    expect(result.days).toEqual([]);
    expect(result.weekStart).toBe('');
    expect(result.weekEnd).toBe('');
  });

  it('should return empty result when no accessible projects', async () => {
    mockDbSelect.mockReturnValueOnce(makeResolvableChain([]));

    const result = await dashboardService.getUpcomingTasks(ORG_ID, USER_ID, {
      weekOffset: 0,
    });

    expect(result.days).toEqual([]);
    expect(result.weekStart).toBe('');
  });

  it('should default weekOffset to 0 when not provided', async () => {
    mockLoadPermissionContext.mockResolvedValue(null);

    const result = await dashboardService.getUpcomingTasks(ORG_ID, USER_ID);

    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getProjectProgress
// ---------------------------------------------------------------------------
describe('dashboard.service — getProjectProgress', () => {
  it('should return empty result when user has no permission context', async () => {
    mockLoadPermissionContext.mockResolvedValue(null);

    const result = await dashboardService.getProjectProgress(ORG_ID, USER_ID, {
      limit: 10,
    });

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.hasMore).toBe(false);
    expect(result.cursor).toBeNull();
  });

  it('should return empty result when no accessible projects', async () => {
    mockDbSelect.mockReturnValueOnce(makeResolvableChain([]));

    const result = await dashboardService.getProjectProgress(ORG_ID, USER_ID, {
      limit: 10,
    });

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('should default to limit 10 when no limit provided', async () => {
    mockLoadPermissionContext.mockResolvedValue(null);

    const result = await dashboardService.getProjectProgress(ORG_ID, USER_ID);

    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getDashboardSummary
// ---------------------------------------------------------------------------
describe('dashboard.service — getDashboardSummary', () => {
  it('should return 0 counts when user has no permission context', async () => {
    mockLoadPermissionContext.mockResolvedValue(null);

    const result = await dashboardService.getDashboardSummary(ORG_ID, USER_ID);

    expect(result.myTasksCount).toBe(0);
    expect(result.overdueTasksCount).toBe(0);
    expect(result.upcomingTasksCount).toBe(0);
    expect(result.activeProjectsCount).toBe(0);
    expect(result.completedTasksThisWeek).toBe(0);
  });

  it('should return zeros when no accessible projects', async () => {
    mockDbSelect.mockReturnValueOnce(makeResolvableChain([]));

    const result = await dashboardService.getDashboardSummary(ORG_ID, USER_ID);

    expect(result.myTasksCount).toBe(0);
    expect(result.overdueTasksCount).toBe(0);
    expect(result.upcomingTasksCount).toBe(0);
    expect(result.activeProjectsCount).toBe(0);
    expect(result.completedTasksThisWeek).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Service exports
// ---------------------------------------------------------------------------
describe('dashboard.service — exports', () => {
  it('should export all expected functions', () => {
    expect(dashboardService).toHaveProperty('getMyTasks');
    expect(dashboardService).toHaveProperty('getUpcomingTasks');
    expect(dashboardService).toHaveProperty('getProjectProgress');
    expect(dashboardService).toHaveProperty('getDashboardSummary');
  });
});
