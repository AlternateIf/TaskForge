/**
 * Service-level integration tests for the task state transition validation feature.
 *
 * Tests scenarios:
 * 5. validateStatusTransition — allowed/blocker scenarios
 * 6. updateTaskPosition guard (legacy and anchored branches)
 * 7. Bulk updateStatus guard with per-task failure details
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ErrorCode } from '../../utils/errors.js';

// ---------------------------------------------------------------------------
// Shared mock infrastructure
// ---------------------------------------------------------------------------
//
// The Drizzle query builder chains are deeply nested. Each `db.select()` call
// returns a chainable object. The terminal methods that produce Promises are
// `.limit()` and await-ing the chain itself (for queries that end at `.where()`).
// We intercept every `db.select()` and provide the next result from a queue.
// Similarly `db.update().set().where()` is intercepted.
//

const mockComputeBlockedStatus = vi.fn();
const mockCheckPermission = vi.fn();
const mockLoadPermissionContext = vi.fn();
const mockIndexTask = vi.fn();
const mockRemoveTask = vi.fn();
const mockActivityLog = vi.fn();

// Queue: each entry is the resolved value for the next db.select() chain.
const selectQueue: unknown[][] = [];
let selectIdx = 0;

// Update chains
let updateSetFn: ((...args: unknown[]) => void) | null = null;
let updateWhereFn: ((...args: unknown[]) => void) | null = null;

vi.mock('@taskforge/db', () => {
  function chain(result: unknown[]) {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    const terminal = Promise.resolve(result) as Promise<unknown[]> &
      Record<string, ReturnType<typeof vi.fn>>;

    terminal.where = vi.fn().mockReturnValue(terminal);
    terminal.limit = vi.fn().mockResolvedValue(result);
    terminal.orderBy = vi.fn().mockReturnValue(terminal);
    terminal.groupBy = vi.fn().mockReturnValue(terminal);

    c.from = vi.fn().mockReturnValue(c);
    c.innerJoin = vi.fn().mockReturnValue(c);
    c.leftJoin = vi.fn().mockReturnValue(c);
    c.where = vi.fn().mockReturnValue(terminal);
    c.limit = vi.fn().mockResolvedValue(result);
    c.orderBy = vi.fn().mockReturnValue(terminal);
    c.groupBy = vi.fn().mockReturnValue(c);
    c.set = vi.fn().mockReturnValue(c);
    return c;
  }

  const mockDbUpdate = vi.fn().mockImplementation(() => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    c.set = vi.fn().mockImplementation((...args: unknown[]) => {
      if (updateSetFn) updateSetFn(...args);
      return c;
    });
    c.where = vi.fn().mockImplementation((...args: unknown[]) => {
      if (updateWhereFn) updateWhereFn(...args);
      return Promise.resolve(undefined);
    });
    return c;
  });

  const mockDbInsert = vi.fn().mockImplementation(() => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    c.values = vi.fn().mockResolvedValue(undefined);
    return c;
  });

  const mockDbDelete = vi.fn().mockImplementation(() => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    c.where = vi.fn().mockResolvedValue(undefined);
    return c;
  });

  return {
    db: {
      select: vi.fn().mockImplementation(() => {
        const result = selectQueue[selectIdx] ?? [];
        selectIdx++;
        return chain(result);
      }),
      update: mockDbUpdate,
      insert: mockDbInsert,
      delete: mockDbDelete,
    },
    checklistItems: {
      isCompleted: 'checklistItems.isCompleted',
      checklistId: 'checklistItems.checklistId',
    },
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
    projectMembers: { projectId: 'projectMembers.projectId', userId: 'projectMembers.userId' },
    projects: {
      id: 'projects.id',
      organizationId: 'projects.organizationId',
      name: 'projects.name',
      deletedAt: 'projects.deletedAt',
    },
    taskDependencies: {
      id: 'taskDependencies.id',
      taskId: 'taskDependencies.taskId',
      dependsOnTaskId: 'taskDependencies.dependsOnTaskId',
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
    users: { id: 'users.id', displayName: 'users.displayName', avatarUrl: 'users.avatarUrl' },
    workflowStatuses: {
      id: 'workflowStatuses.id',
      name: 'workflowStatuses.name',
      workflowId: 'workflowStatuses.workflowId',
      isInitial: 'workflowStatuses.isInitial',
      isFinal: 'workflowStatuses.isFinal',
      isValidated: 'workflowStatuses.isValidated',
      position: 'workflowStatuses.position',
    },
    workflows: { id: 'workflows.id', projectId: 'workflows.projectId' },
  };
});

vi.mock('../dependency.service.js', () => ({
  computeBlockedStatus: (...args: unknown[]) => mockComputeBlockedStatus(...args),
  createDependency: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../permission.service.js', () => ({
  checkPermission: (...args: unknown[]) => mockCheckPermission(...args),
  loadPermissionContext: (...args: unknown[]) => mockLoadPermissionContext(...args),
}));

vi.mock('../search.service.js', () => ({
  indexTask: (...args: unknown[]) => mockIndexTask(...args),
  removeTask: (...args: unknown[]) => mockRemoveTask(...args),
  searchProjectTaskIds: vi.fn().mockResolvedValue([]),
}));

vi.mock('../activity.service.js', () => ({
  log: (...args: unknown[]) => mockActivityLog(...args),
}));

const { validateStatusTransition } = await import('../task.service.js');
const { executeBulkAction } = await import('../bulk.service.js');

// ---------------------------------------------------------------------------
// 5. validateStatusTransition
// ---------------------------------------------------------------------------

describe('validateStatusTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    selectIdx = 0;
    mockComputeBlockedStatus.mockReset();
    mockCheckPermission.mockResolvedValue(true);
    mockLoadPermissionContext.mockResolvedValue({
      orgId: 'org-1',
      effectivePermissions: [],
      projectCache: new Map(),
    });
  });

  // Scenario 1: Allowed — no blockers, no incomplete checklists
  it('allows transition to validated status when no blockers and no incomplete checklists', async () => {
    selectQueue.push(
      [{ isFinal: false, isValidated: true }], // status flags
    );
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: false, blockedByCount: 0 });
    selectQueue.push([]); // loadTaskProgress: no checklists

    await expect(
      validateStatusTransition('task-1', 'status-validated', 'project-1'),
    ).resolves.toBeUndefined();
  });

  it('allows transition to final status when no blockers and no incomplete checklists', async () => {
    selectQueue.push([{ isFinal: true, isValidated: false }]);
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: false, blockedByCount: 0 });
    selectQueue.push([]); // no checklists

    await expect(
      validateStatusTransition('task-1', 'status-final', 'project-1'),
    ).resolves.toBeUndefined();
  });

  it('allows transition with all checklists complete', async () => {
    selectQueue.push([{ isFinal: true, isValidated: false }]);
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: false, blockedByCount: 0 });
    selectQueue.push([{ id: 'cl-1' }]); // checklist rows
    selectQueue.push([{ isCompleted: true }, { isCompleted: true }]); // items all complete

    await expect(
      validateStatusTransition('task-1', 'status-final', 'project-1'),
    ).resolves.toBeUndefined();
  });

  // Scenario 2: Blocked — 1+ unresolved blockers
  it('blocks transition to validated status when 1+ unresolved blockers', async () => {
    selectQueue.push([{ isFinal: false, isValidated: true }]);
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: true, blockedByCount: 2 });
    selectQueue.push([]); // no checklists

    await expect(
      validateStatusTransition('task-1', 'status-validated', 'project-1'),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: ErrorCode.TRANSITION_BLOCKED,
      transitionDetails: { unresolvedBlockersCount: 2, incompleteChecklistCount: 0 },
    });
  });

  it('includes correct message with plural "blockers" for count > 1', async () => {
    selectQueue.push([{ isFinal: false, isValidated: true }]);
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: true, blockedByCount: 2 });
    selectQueue.push([]);

    try {
      await validateStatusTransition('task-1', 'status-validated', 'project-1');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).message).toContain('2 unresolved blockers');
      expect((err as AppError).message).toContain('validated');
    }
  });

  // Scenario 3: Blocked — 1+ incomplete checklists
  it('blocks transition to final status when 1+ incomplete checklist items', async () => {
    selectQueue.push([{ isFinal: true, isValidated: false }]);
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: false, blockedByCount: 0 });
    selectQueue.push([]); // loadTaskProgress: subtask rows
    selectQueue.push([{ id: 'cl-1' }]); // checklist rows
    selectQueue.push([{ isCompleted: true }, { isCompleted: false }, { isCompleted: false }]); // 2 incomplete

    await expect(
      validateStatusTransition('task-1', 'status-final', 'project-1'),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: ErrorCode.TRANSITION_BLOCKED,
      transitionDetails: { unresolvedBlockersCount: 0, incompleteChecklistCount: 2 },
    });
  });

  // Scenario 4: Mixed failure — both blockers and incomplete checklists
  it('blocks transition with both blockers and incomplete checklists', async () => {
    selectQueue.push([{ isFinal: true, isValidated: true }]);
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: true, blockedByCount: 1 });
    selectQueue.push([]); // loadTaskProgress: subtask rows
    selectQueue.push([{ id: 'cl-1' }]); // checklist rows
    selectQueue.push([
      { isCompleted: true },
      { isCompleted: true },
      { isCompleted: true },
      { isCompleted: false },
      { isCompleted: false },
    ]); // 2 incomplete of 5

    try {
      await validateStatusTransition('task-1', 'status-both', 'project-1');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(422);
      expect(appErr.code).toBe(ErrorCode.TRANSITION_BLOCKED);
      expect(appErr.transitionDetails).toEqual({
        unresolvedBlockersCount: 1,
        incompleteChecklistCount: 2,
      });
      expect(appErr.message).toContain('validated');
      expect(appErr.message).toContain('1 unresolved blocker');
      expect(appErr.message).toContain('2 incomplete checklist items');
    }
  });

  // Scenario 5: Non-validated/non-final — no checks
  it('allows transition to non-final non-validated status without checks', async () => {
    selectQueue.push([{ isFinal: false, isValidated: false }]);

    await expect(
      validateStatusTransition('task-1', 'status-in-progress', 'project-1'),
    ).resolves.toBeUndefined();

    expect(mockComputeBlockedStatus).not.toHaveBeenCalled();
  });

  it('throws UNPROCESSABLE_ENTITY when target status not found in project', async () => {
    selectQueue.push([]); // empty = status not found

    await expect(
      validateStatusTransition('task-1', 'status-nonexistent', 'project-1'),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: ErrorCode.UNPROCESSABLE_ENTITY,
    });
  });

  it('singular "blocker" message when count is exactly 1', async () => {
    selectQueue.push([{ isFinal: false, isValidated: true }]);
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: true, blockedByCount: 1 });
    selectQueue.push([]);

    try {
      await validateStatusTransition('task-1', 'status-validated', 'project-1');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).message).toContain('1 unresolved blocker');
      expect((err as AppError).message).not.toContain('1 unresolved blockers');
    }
  });

  it('singular "checklist item" message when count is exactly 1', async () => {
    selectQueue.push([{ isFinal: true, isValidated: false }]);
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: false, blockedByCount: 0 });
    selectQueue.push([]); // loadTaskProgress: subtask rows
    selectQueue.push([{ id: 'cl-1' }]);
    selectQueue.push([{ isCompleted: true }, { isCompleted: false }]);

    try {
      await validateStatusTransition('task-1', 'status-final', 'project-1');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const msg = (err as AppError).message;
      expect(msg).toContain('1 incomplete checklist item');
      expect(msg).not.toContain('1 incomplete checklist items');
    }
  });

  it('uses "final" label when isFinal=true and isValidated=false', async () => {
    selectQueue.push([{ isFinal: true, isValidated: false }]);
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: true, blockedByCount: 1 });
    selectQueue.push([]);

    try {
      await validateStatusTransition('task-1', 'status-final', 'project-1');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect((err as AppError).message).toContain('final');
      expect((err as AppError).message).not.toContain('validated');
    }
  });

  it('uses "validated" label when isValidated=true (even if isFinal also true)', async () => {
    selectQueue.push([{ isFinal: true, isValidated: true }]);
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: true, blockedByCount: 1 });
    selectQueue.push([]);

    try {
      await validateStatusTransition('task-1', 'status-both', 'project-1');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect((err as AppError).message).toContain('validated');
    }
  });
});

// ---------------------------------------------------------------------------
// 6. updateTaskPosition guard
// ---------------------------------------------------------------------------

describe('updateTaskPosition transition guard', () => {
  const existingTask = {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Test Task',
    description: null,
    statusId: 'status-in-progress',
    priority: 'medium',
    assigneeId: null,
    reporterId: 'user-1',
    parentTaskId: null,
    dueDate: null,
    startDate: null,
    estimatedHours: null,
    position: 1000,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    selectIdx = 0;
    mockComputeBlockedStatus.mockReset();
    mockCheckPermission.mockResolvedValue(true);
    updateSetFn = null;
    updateWhereFn = null;
  });

  it('legacy branch: blocks position+status move to validated status with blockers', async () => {
    selectQueue.push(
      [existingTask], // 0: fetch task
      [{ id: 'status-validated' }], // 1: validateStatusBelongsToProject
      [{ isFinal: false, isValidated: true }], // 2: validateStatusTransition flags
    );
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: true, blockedByCount: 1 });
    selectQueue.push([]); // 3: loadTaskProgress subtasks (none)

    const { updateTaskPosition } = await import('../task.service.js');
    await expect(
      updateTaskPosition('task-1', 'project-1', { position: 2000, statusId: 'status-validated' }),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: ErrorCode.TRANSITION_BLOCKED,
      transitionDetails: { unresolvedBlockersCount: 1, incompleteChecklistCount: 0 },
    });
  });

  it('anchored branch: blocks move to final status with incomplete checklists', async () => {
    selectQueue.push(
      [existingTask], // 0: fetch task
      [{ id: 'task-2', statusId: 'status-final', position: 500 }], // 1: getTaskAnchor(before)
      [{ id: 'status-final' }], // 2: validateStatusBelongsToProject
      [{ isFinal: true, isValidated: false }], // 3: validateStatusTransition flags
    );
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: false, blockedByCount: 0 });
    selectQueue.push([]); // 4: loadTaskProgress subtask rows
    selectQueue.push([{ id: 'cl-1' }]); // 5: checklist rows
    selectQueue.push([{ isCompleted: false }]); // 6: checklist items

    const { updateTaskPosition } = await import('../task.service.js');
    await expect(
      updateTaskPosition('task-1', 'project-1', {
        beforeTaskId: 'task-2',
        statusId: 'status-final',
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.TRANSITION_BLOCKED,
      transitionDetails: { unresolvedBlockersCount: 0, incompleteChecklistCount: 1 },
    });
  });
});

// ---------------------------------------------------------------------------
// 7. Bulk updateStatus guard
// ---------------------------------------------------------------------------

describe('executeBulkAction updateStatus with transition guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    selectIdx = 0;
    mockComputeBlockedStatus.mockReset();
    mockCheckPermission.mockResolvedValue(true);
    updateSetFn = null;
    updateWhereFn = null;
  });

  it('blocks individual tasks with transition details while succeeding others', async () => {
    const taskId1 = 'task-ok';
    const taskId2 = 'task-blocked';

    selectQueue.push(
      // 0: Pre-fetch all tasks
      [
        {
          id: taskId1,
          projectId: 'project-1',
          statusId: 'status-in-progress',
          assigneeId: null,
          priority: 'medium',
          parentTaskId: null,
          dueDate: null,
          startDate: null,
          estimatedHours: null,
          position: 1000,
          title: 'OK',
          description: null,
          reporterId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: taskId2,
          projectId: 'project-1',
          statusId: 'status-in-progress',
          assigneeId: null,
          priority: 'medium',
          parentTaskId: null,
          dueDate: null,
          startDate: null,
          estimatedHours: null,
          position: 2000,
          title: 'Blocked',
          description: null,
          reporterId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ],
      // 1: taskId1 status check
      [{ id: 'status-final' }],
      // 2: taskId1 validateStatusTransition flags
      [{ isFinal: true, isValidated: false }],
    );
    // taskId1: computeBlockedStatus -> clear
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: false, blockedByCount: 0 });
    // taskId1: loadTaskProgress (no subtasks/checklists)
    selectQueue.push([]);
    selectQueue.push([]);

    // taskId1: db.update
    updateSetFn = vi.fn().mockReturnValue('ok');
    updateWhereFn = vi.fn().mockResolvedValue(undefined);

    // --- taskId2 (blocked) ---
    selectQueue.push(
      [{ id: 'status-final' }], // 6: status check
      [{ isFinal: true, isValidated: false }], // 7: validateStatusTransition flags
    );
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: true, blockedByCount: 3 });
    // taskId2: loadTaskProgress
    selectQueue.push([]); // subtask rows
    selectQueue.push([{ id: 'cl-1' }]); // checklist rows
    selectQueue.push([{ isCompleted: true }, { isCompleted: false }, { isCompleted: false }]); // checklist items

    const result = await executeBulkAction({
      action: 'updateStatus',
      ids: [taskId1, taskId2],
      data: { statusId: 'status-final' },
    });

    expect(result.succeeded).toEqual([taskId1]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].id).toBe(taskId2);
    expect(result.failed[0].error.code).toBe('TRANSITION_BLOCKED');
    expect(result.failed[0].error.transitionDetails).toEqual({
      unresolvedBlockersCount: 3,
      incompleteChecklistCount: 2,
    });
    expect(result.total).toBe(2);
  });

  it('reports per-task NOT_FOUND for missing tasks', async () => {
    selectQueue.push([]); // no tasks found

    const result = await executeBulkAction({
      action: 'updateStatus',
      ids: ['task-missing'],
      data: { statusId: 'status-final' },
    });

    expect(result.succeeded).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].id).toBe('task-missing');
    expect(result.failed[0].error.code).toBe('NOT_FOUND');
  });

  it('skips transition guard when bulk statusId matches existing task status', async () => {
    const taskId = 'task-same';

    selectQueue.push(
      // pre-fetch
      [
        {
          id: taskId,
          projectId: 'project-1',
          statusId: 'status-final',
          assigneeId: null,
          priority: 'medium',
          parentTaskId: null,
          dueDate: null,
          startDate: null,
          estimatedHours: null,
          position: 1000,
          title: 'Same',
          description: null,
          reporterId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ],
      // status check
      [{ id: 'status-final' }],
    );

    updateSetFn = vi.fn();
    updateWhereFn = vi.fn().mockResolvedValue(undefined);

    const result = await executeBulkAction({
      action: 'updateStatus',
      ids: [taskId],
      data: { statusId: 'status-final' },
    });

    expect(result.succeeded).toEqual([taskId]);
    expect(result.failed).toEqual([]);
    expect(mockComputeBlockedStatus).not.toHaveBeenCalled();
  });

  it('reports transition details for all failed tasks in bulk update', async () => {
    const taskId1 = 'task-b1';
    const taskId2 = 'task-b2';

    selectQueue.push(
      // pre-fetch
      [
        {
          id: taskId1,
          projectId: 'project-1',
          statusId: 'status-todo',
          assigneeId: null,
          priority: 'low',
          parentTaskId: null,
          dueDate: null,
          startDate: null,
          estimatedHours: null,
          position: 1000,
          title: 'B1',
          description: null,
          reporterId: 'u1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: taskId2,
          projectId: 'project-1',
          statusId: 'status-todo',
          assigneeId: null,
          priority: 'low',
          parentTaskId: null,
          dueDate: null,
          startDate: null,
          estimatedHours: null,
          position: 2000,
          title: 'B2',
          description: null,
          reporterId: 'u1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ],
      // taskId1 status check
      [{ id: 'status-validated' }],
      // taskId1 validateStatusTransition
      [{ isFinal: false, isValidated: true }],
    );
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: true, blockedByCount: 1 });
    // taskId1: no subtasks, no checklists
    selectQueue.push([]);
    selectQueue.push([]);

    // taskId2 status check
    selectQueue.push([{ id: 'status-validated' }]);
    // taskId2 validateStatusTransition
    selectQueue.push([{ isFinal: false, isValidated: true }]);
    mockComputeBlockedStatus.mockResolvedValueOnce({ isBlocked: true, blockedByCount: 2 });
    // taskId2: no subtasks, then checklists and items
    selectQueue.push([]);
    selectQueue.push([{ id: 'cl-x' }]);
    selectQueue.push([{ isCompleted: false }, { isCompleted: false }]);

    const result = await executeBulkAction({
      action: 'updateStatus',
      ids: [taskId1, taskId2],
      data: { statusId: 'status-validated' },
    });

    expect(result.succeeded).toEqual([]);
    expect(result.failed).toHaveLength(2);

    expect(result.failed[0].id).toBe(taskId1);
    expect(result.failed[0].error.code).toBe('TRANSITION_BLOCKED');
    expect(result.failed[0].error.transitionDetails).toEqual({
      unresolvedBlockersCount: 1,
      incompleteChecklistCount: 0,
    });

    expect(result.failed[1].id).toBe(taskId2);
    expect(result.failed[1].error.code).toBe('TRANSITION_BLOCKED');
    expect(result.failed[1].error.transitionDetails).toEqual({
      unresolvedBlockersCount: 2,
      incompleteChecklistCount: 2,
    });
  });
});
