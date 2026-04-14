import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '../../utils/errors.js';
import { decodeCursor, encodeCursor } from '../../utils/pagination.js';

const mockDbSelect = vi.fn();
const mockDbFrom = vi.fn();
const mockDbWhere = vi.fn();
const mockDbLimit = vi.fn();
const mockDbLeftJoin = vi.fn();
const mockDbInnerJoin = vi.fn();
const mockDbOrderBy = vi.fn();

const mockHasOrgPermission = vi.fn().mockResolvedValue(true);
const mockSearchProjectTaskIds = vi.fn().mockResolvedValue([]);

const queryChain: Record<string, ReturnType<typeof vi.fn>> = {
  from: mockDbFrom,
  where: mockDbWhere,
  limit: mockDbLimit,
  leftJoin: mockDbLeftJoin,
  innerJoin: mockDbInnerJoin,
  orderBy: mockDbOrderBy,
};

function resetQueryChain() {
  mockDbSelect.mockReset().mockReturnValue(queryChain);
  for (const fn of Object.values(queryChain)) {
    fn.mockReset().mockReturnValue(queryChain);
  }
}

vi.mock('@taskforge/db', () => ({
  db: { select: mockDbSelect },
  checklistItems: { id: 'checklistItems.id', checklistId: 'checklistItems.checklistId' },
  checklists: { id: 'checklists.id', taskId: 'checklists.taskId' },
  labels: {
    id: 'labels.id',
    name: 'labels.name',
    color: 'labels.color',
    projectId: 'labels.projectId',
  },
  organizationMembers: {
    id: 'organizationMembers.id',
    organizationId: 'organizationMembers.organizationId',
    userId: 'organizationMembers.userId',
  },
  projects: {
    id: 'projects.id',
    organizationId: 'projects.organizationId',
    name: 'projects.name',
    deletedAt: 'projects.deletedAt',
  },
  taskLabels: { taskId: 'taskLabels.taskId', labelId: 'taskLabels.labelId' },
  taskWatchers: { taskId: 'taskWatchers.taskId', userId: 'taskWatchers.userId' },
  tasks: {
    id: 'tasks.id',
    projectId: 'tasks.projectId',
    title: 'tasks.title',
    description: 'tasks.description',
    statusId: 'tasks.statusId',
    priority: 'tasks.priority',
    assigneeId: 'tasks.assigneeId',
    reporterId: 'tasks.reporterId',
    parentTaskId: 'tasks.parentTaskId',
    dueDate: 'tasks.dueDate',
    startDate: 'tasks.startDate',
    estimatedHours: 'tasks.estimatedHours',
    position: 'tasks.position',
    createdAt: 'tasks.createdAt',
    updatedAt: 'tasks.updatedAt',
    deletedAt: 'tasks.deletedAt',
  },
  users: {
    id: 'users.id',
    displayName: 'users.displayName',
    avatarUrl: 'users.avatarUrl',
  },
  workflowStatuses: {
    id: 'workflowStatuses.id',
    name: 'workflowStatuses.name',
    workflowId: 'workflowStatuses.workflowId',
    isInitial: 'workflowStatuses.isInitial',
    isFinal: 'workflowStatuses.isFinal',
  },
  workflows: { id: 'workflows.id', projectId: 'workflows.projectId' },
}));

vi.mock('../permission.service.js', () => ({
  hasOrgPermission: (...args: unknown[]) => mockHasOrgPermission(...args),
}));

vi.mock('../search.service.js', () => ({
  indexTask: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn().mockResolvedValue(undefined),
  searchProjectTaskIds: (...args: unknown[]) => mockSearchProjectTaskIds(...args),
}));

vi.mock('../activity.service.js', () => ({
  log: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../dependency.service.js', () => ({
  computeBlockedStatus: vi.fn().mockResolvedValue({ isBlocked: false, blockedByCount: 0 }),
  createDependency: vi.fn().mockResolvedValue(undefined),
}));

const { listTasksPaged } = await import('../task.service.js');

function makeTaskRow(id: string, createdAtIso: string) {
  const createdAt = new Date(createdAtIso);
  return {
    task: {
      id,
      projectId: 'project-1',
      title: `Task ${id}`,
      description: null,
      statusId: 'status-1',
      priority: 'medium',
      assigneeId: null,
      reporterId: 'user-1',
      parentTaskId: null,
      dueDate: null,
      startDate: null,
      estimatedHours: null,
      position: Number(id.replace('task-', '')) * 1000,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    },
    statusName: 'To Do',
    assigneeDisplayName: null,
    assigneeAvatarUrl: null,
  };
}

describe('task.service listTasksPaged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryChain();
    mockHasOrgPermission.mockResolvedValue(true);
    mockSearchProjectTaskIds.mockResolvedValue([]);
  });

  it('returns a page with cursor metadata when more rows exist', async () => {
    mockDbLimit
      .mockResolvedValueOnce([{ organizationId: 'org-1' }])
      .mockResolvedValueOnce([
        makeTaskRow('task-1', '2026-04-10T10:00:00.000Z'),
        makeTaskRow('task-2', '2026-04-09T10:00:00.000Z'),
        makeTaskRow('task-3', '2026-04-08T10:00:00.000Z'),
      ]);

    mockDbWhere
      .mockReturnValueOnce(queryChain)
      .mockResolvedValueOnce([{ count: 3 }])
      .mockReturnValueOnce(queryChain)
      .mockResolvedValueOnce([]);

    const result = await listTasksPaged(
      'project-1',
      { sort: 'createdAt', order: 'desc' },
      { limit: 2 },
      'user-1',
    );

    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.id)).toEqual(['task-1', 'task-2']);
    expect(result.hasMore).toBe(true);
    expect(result.totalCount).toBe(3);
    expect(result.cursor).toBeTruthy();

    const cursor = decodeCursor(result.cursor as string);
    expect(cursor).toMatchObject({
      id: 'task-2',
      sortField: 'createdAt',
      sortOrder: 'desc',
      sortValue: '2026-04-09T10:00:00.000Z',
    });
  });

  it('accepts a matching cursor and returns the next page', async () => {
    const cursor = encodeCursor({
      id: 'task-2',
      sortField: 'createdAt',
      sortOrder: 'desc',
      sortValue: '2026-04-09T10:00:00.000Z',
    });

    mockDbLimit
      .mockResolvedValueOnce([{ organizationId: 'org-1' }])
      .mockResolvedValueOnce([makeTaskRow('task-3', '2026-04-08T10:00:00.000Z')]);

    mockDbWhere
      .mockReturnValueOnce(queryChain)
      .mockResolvedValueOnce([{ count: 3 }])
      .mockReturnValueOnce(queryChain)
      .mockResolvedValueOnce([]);

    const result = await listTasksPaged(
      'project-1',
      { sort: 'createdAt', order: 'desc' },
      { cursor, limit: 2 },
      'user-1',
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('task-3');
    expect(result.hasMore).toBe(false);
    expect(result.cursor).toBeNull();
  });

  it('rejects cursor when sort does not match the current request', async () => {
    const cursor = encodeCursor({
      id: 'task-1',
      sortField: 'createdAt',
      sortOrder: 'desc',
      sortValue: '2026-04-10T10:00:00.000Z',
    });

    mockDbLimit.mockResolvedValueOnce([{ organizationId: 'org-1' }]);
    mockDbWhere.mockReturnValueOnce(queryChain);

    await expect(
      listTasksPaged('project-1', { sort: 'priority', order: 'asc' }, { cursor }, 'user-1'),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Task cursor does not match current sort',
    });
  });
});
