import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Control UUID generation so we can predict generated IDs in deletion-logic tests
const mockRandomUUID = vi.fn();

vi.mock('node:crypto', () => ({
  default: {
    randomUUID: mockRandomUUID,
    randomBytes: vi.fn().mockImplementation(() => ({ toString: () => 'deadbeef' })),
  },
}));

// --- Mock @taskforge/db ---

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();
const mockDbTransaction = vi.fn();

// Transaction-scoped mocks — these are used by the tx callback inside
// db.transaction(). They are distinct from the top-level db mocks so we can
// verify that validation + write happen inside the transaction.
const mockTxSelect = vi.fn();
const mockTxUpdate = vi.fn();

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
    delete: mockDbDelete,
    transaction: mockDbTransaction,
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
  labels: {
    id: 'labels.id',
    projectId: 'labels.projectId',
    name: 'labels.name',
    color: 'labels.color',
    createdAt: 'labels.createdAt',
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
  projectMembers: {
    id: 'projectMembers.id',
    projectId: 'projectMembers.projectId',
    userId: 'projectMembers.userId',
    roleId: 'projectMembers.roleId',
    createdAt: 'projectMembers.createdAt',
  },
  roles: { id: 'roles.id', name: 'roles.name', organizationId: 'roles.organizationId' },
  tasks: {
    id: 'tasks.id',
    projectId: 'tasks.projectId',
    statusId: 'tasks.statusId',
    deletedAt: 'tasks.deletedAt',
  },
  users: {
    id: 'users.id',
    email: 'users.email',
    displayName: 'users.displayName',
    avatarUrl: 'users.avatarUrl',
    deletedAt: 'users.deletedAt',
  },
}));

vi.mock('../activity.service.js', () => ({
  log: vi.fn().mockResolvedValue(undefined),
}));

const mockHasOrgPermission = vi.fn().mockResolvedValue(true);

vi.mock('../permission.service.js', () => ({
  hasOrgPermission: (...args: unknown[]) => mockHasOrgPermission(...args),
}));

vi.mock('../search.service.js', () => ({
  indexProject: vi.fn().mockResolvedValue(undefined),
  removeProject: vi.fn().mockResolvedValue(undefined),
  searchProjectTaskIds: vi.fn().mockResolvedValue([]),
}));

const { bulkUpsertWorkflowStatuses, bulkUpsertLabels, finishProject } = await import(
  '../project.service.js'
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a thenable fluent query-builder chain.
 * Awaiting the chain (or any method that returns it) resolves to `result`.
 * All builder methods (from, where, limit, set, values, etc.) return the same chain.
 */
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

// ─── Fixtures ────────────────────────────────────────────────────────────────

const projectId = 'project-uuid';
const workflowId = 'workflow-uuid';
const workflowRow = { id: workflowId, projectId, name: 'Default', isDefault: true };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('project.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRandomUUID.mockReturnValue('generated-id-default');
    mockTxSelect.mockReset();
    mockTxUpdate.mockReset();
    mockDbTransaction.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('bulkUpsertWorkflowStatuses', () => {
    it('throws AppError when no default workflow exists', async () => {
      mockDbSelect.mockImplementation(() => makeQueryChain([]));

      await expect(
        bulkUpsertWorkflowStatuses(projectId, [{ id: 'new-1', name: 'X', position: 0 }]),
      ).rejects.toThrow('Default workflow not found');

      expect(mockDbInsert).not.toHaveBeenCalled();
      expect(mockDbDelete).not.toHaveBeenCalled();
    });

    it('inserts a new status and does not delete it in the cleanup step', async () => {
      const generatedId = 'gen-status-uuid';
      mockRandomUUID.mockReturnValue(generatedId);

      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        // 1st select: workflow lookup
        if (selectCount === 1) return makeQueryChain([workflowRow]);
        // 2nd select: current statuses — contains the just-inserted ID
        return makeQueryChain([{ id: generatedId }]);
      });

      const insertChain = makeQueryChain(undefined);
      mockDbInsert.mockReturnValue(insertChain);

      await bulkUpsertWorkflowStatuses(projectId, [
        { id: 'new-pending', name: 'Pending', color: '#888', position: 0 },
      ]);

      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      const insertedValues = (insertChain.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(insertedValues.id).toBe(generatedId);
      expect(insertedValues.name).toBe('Pending');
      expect(insertedValues.color).toBe('#888');
      expect(insertedValues.workflowId).toBe(workflowId);
      expect(insertedValues.position).toBe(0);

      // Newly inserted status must NOT be deleted
      expect(mockDbDelete).not.toHaveBeenCalled();
    });

    it('updates an existing status', async () => {
      const existingId = 'existing-status-uuid';

      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) return makeQueryChain([workflowRow]);
        return makeQueryChain([{ id: existingId }]);
      });

      const updateChain = makeQueryChain(undefined);
      mockDbUpdate.mockReturnValue(updateChain);

      await bulkUpsertWorkflowStatuses(projectId, [
        { id: existingId, name: 'In Progress', color: '#3B82F6', position: 0 },
      ]);

      expect(mockDbUpdate).toHaveBeenCalledTimes(1);
      const setArgs = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(setArgs.name).toBe('In Progress');
      expect(setArgs.color).toBe('#3B82F6');
      expect(setArgs.position).toBe(0);

      expect(mockDbInsert).not.toHaveBeenCalled();
      expect(mockDbDelete).not.toHaveBeenCalled();
    });

    it('deletes statuses not present in the input list', async () => {
      const keepId = 'keep-status-uuid';
      const deleteId = 'delete-status-uuid';

      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) return makeQueryChain([workflowRow]);
        return makeQueryChain([{ id: keepId }, { id: deleteId }]);
      });

      const updateChain = makeQueryChain(undefined);
      mockDbUpdate.mockReturnValue(updateChain);
      const deleteChain = makeQueryChain(undefined);
      mockDbDelete.mockReturnValue(deleteChain);

      await bulkUpsertWorkflowStatuses(projectId, [
        { id: keepId, name: 'To Do', color: '#gray', position: 0 },
      ]);

      expect(mockDbUpdate).toHaveBeenCalledTimes(1);
      expect(mockDbDelete).toHaveBeenCalledTimes(1);
    });

    it('handles mixed: insert new, update existing, delete removed', async () => {
      const keepId = 'keep-uuid';
      const deleteId = 'delete-uuid';
      const generatedId = 'gen-uuid-mixed';
      mockRandomUUID.mockReturnValue(generatedId);

      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) return makeQueryChain([workflowRow]);
        // Current statuses: the kept one + the old removed one + the newly inserted one
        return makeQueryChain([{ id: keepId }, { id: deleteId }, { id: generatedId }]);
      });

      const insertChain = makeQueryChain(undefined);
      mockDbInsert.mockReturnValue(insertChain);
      const updateChain = makeQueryChain(undefined);
      mockDbUpdate.mockReturnValue(updateChain);
      const deleteChain = makeQueryChain(undefined);
      mockDbDelete.mockReturnValue(deleteChain);

      await bulkUpsertWorkflowStatuses(projectId, [
        { id: keepId, name: 'Keep', color: null, position: 0 },
        { id: 'new-abc', name: 'Brand New', color: '#f00', position: 1 },
        // deleteId is absent → should be deleted
      ]);

      expect(mockDbUpdate).toHaveBeenCalledTimes(1);
      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      expect(mockDbDelete).toHaveBeenCalledTimes(1);

      // The inserted status has the generated ID with correct data
      const insertedValues = (insertChain.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(insertedValues.id).toBe(generatedId);
      expect(insertedValues.name).toBe('Brand New');
      expect(insertedValues.position).toBe(1);
    });

    it('does not call delete when all statuses are retained', async () => {
      const existingId = 'only-status';

      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) return makeQueryChain([workflowRow]);
        return makeQueryChain([{ id: existingId }]);
      });

      mockDbUpdate.mockReturnValue(makeQueryChain(undefined));

      await bulkUpsertWorkflowStatuses(projectId, [{ id: existingId, name: 'Done', position: 0 }]);

      expect(mockDbDelete).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpsertLabels', () => {
    // bulkUpsertLabels has no workflow lookup — one select for current labels

    it('inserts a new label and does not delete it in the cleanup step', async () => {
      const generatedId = 'gen-label-uuid';
      mockRandomUUID.mockReturnValue(generatedId);

      // Only one select: current labels (contains the just-inserted label)
      mockDbSelect.mockImplementation(() => makeQueryChain([{ id: generatedId }]));

      const insertChain = makeQueryChain(undefined);
      mockDbInsert.mockReturnValue(insertChain);

      await bulkUpsertLabels(projectId, [{ id: 'new-bug', name: 'Bug', color: '#f00' }]);

      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      const insertedValues = (insertChain.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(insertedValues.id).toBe(generatedId);
      expect(insertedValues.name).toBe('Bug');
      expect(insertedValues.color).toBe('#f00');
      expect(insertedValues.projectId).toBe(projectId);

      expect(mockDbDelete).not.toHaveBeenCalled();
    });

    it('updates an existing label', async () => {
      const labelId = 'existing-label-uuid';
      mockDbSelect.mockImplementation(() => makeQueryChain([{ id: labelId }]));

      const updateChain = makeQueryChain(undefined);
      mockDbUpdate.mockReturnValue(updateChain);

      await bulkUpsertLabels(projectId, [{ id: labelId, name: 'Feature', color: '#22c55e' }]);

      expect(mockDbUpdate).toHaveBeenCalledTimes(1);
      const setArgs = (updateChain.set as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(setArgs.name).toBe('Feature');
      expect(setArgs.color).toBe('#22c55e');

      expect(mockDbInsert).not.toHaveBeenCalled();
      expect(mockDbDelete).not.toHaveBeenCalled();
    });

    it('deletes labels not present in the input list', async () => {
      const keepId = 'keep-label-uuid';
      const deleteId = 'delete-label-uuid';

      mockDbSelect.mockImplementation(() => makeQueryChain([{ id: keepId }, { id: deleteId }]));
      mockDbUpdate.mockReturnValue(makeQueryChain(undefined));
      mockDbDelete.mockReturnValue(makeQueryChain(undefined));

      await bulkUpsertLabels(projectId, [{ id: keepId, name: 'Enhancement', color: '#blue' }]);

      expect(mockDbUpdate).toHaveBeenCalledTimes(1);
      expect(mockDbDelete).toHaveBeenCalledTimes(1);
    });

    it('handles mixed: insert new, update existing, delete removed', async () => {
      const keepId = 'keep-label';
      const deleteId = 'delete-label';
      const generatedId = 'gen-label-mixed';
      mockRandomUUID.mockReturnValue(generatedId);

      mockDbSelect.mockImplementation(() =>
        makeQueryChain([{ id: keepId }, { id: deleteId }, { id: generatedId }]),
      );

      const insertChain = makeQueryChain(undefined);
      mockDbInsert.mockReturnValue(insertChain);
      mockDbUpdate.mockReturnValue(makeQueryChain(undefined));
      mockDbDelete.mockReturnValue(makeQueryChain(undefined));

      await bulkUpsertLabels(projectId, [
        { id: keepId, name: 'Keep', color: null },
        { id: 'new-feature', name: 'Feature', color: '#0f0' },
        // deleteId absent → deleted
      ]);

      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      expect(mockDbUpdate).toHaveBeenCalledTimes(1);
      expect(mockDbDelete).toHaveBeenCalledTimes(1);

      const insertedValues = (insertChain.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(insertedValues.id).toBe(generatedId);
      expect(insertedValues.name).toBe('Feature');
    });
  });

  describe('finishProject', () => {
    const orgId = 'org-uuid';
    const actorId = 'actor-uuid';
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

    beforeEach(() => {
      mockHasOrgPermission.mockResolvedValue(true);

      // Default: db.transaction calls the callback and passes a mock tx
      // that delegates to the tx-scoped mock functions.
      mockDbTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          select: mockTxSelect,
          update: mockTxUpdate,
        };
        return callback(tx);
      });
    });

    it('successfully finishes a project when all tasks are final', async () => {
      // Top-level selects: getOrgIdForProject + project lookup + getProject
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        // 1st select: getOrgIdForProject → [{ orgId }]
        if (selectCount === 1) return makeQueryChain([{ orgId }]);
        // 2nd select: project lookup → returns active project
        if (selectCount === 2) return makeQueryChain([activeProject]);
        // 3rd select (after tx): getProject → returns archived project state
        return makeQueryChain([{ ...activeProject, status: 'archived' }]);
      });

      // Transaction-scoped selects: re-read project + hasNonFinalTasks
      let txSelectCount = 0;
      mockTxSelect.mockImplementation(() => {
        txSelectCount++;
        // 1st tx select: re-read project inside tx → active
        if (txSelectCount === 1) return makeQueryChain([activeProject]);
        // 2nd tx select: hasNonFinalTasks via tx → empty (no non-final tasks)
        return makeQueryChain([]);
      });

      const txUpdateChain = makeQueryChain(undefined);
      mockTxUpdate.mockReturnValue(txUpdateChain);

      const result = await finishProject(projectId, actorId);

      expect(result).toBeDefined();
      expect(mockDbTransaction).toHaveBeenCalled();
      expect(mockTxUpdate).toHaveBeenCalled();
      const { log } = await import('../activity.service.js');
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'finished',
          entityId: projectId,
        }),
      );
    });

    it('returns 422 when a non-final task exists (detected inside transaction)', async () => {
      // Top-level selects: getOrgIdForProject + project lookup
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        // 1st select: getOrgIdForProject → [{ orgId }]
        if (selectCount === 1) return makeQueryChain([{ orgId }]);
        // 2nd select: project lookup → active project
        return makeQueryChain([activeProject]);
      });

      // Transaction-scoped selects
      let txSelectCount = 0;
      mockTxSelect.mockImplementation(() => {
        txSelectCount++;
        // 1st tx select: re-read project inside tx → active
        if (txSelectCount === 1) return makeQueryChain([activeProject]);
        // 2nd tx select: hasNonFinalTasks via tx → returns 1 row (non-final task found)
        return makeQueryChain([{ id: 'non-final-task-id' }]);
      });

      await expect(finishProject(projectId, actorId)).rejects.toThrow(
        'Finish all open tasks before marking this project as finished.',
      );

      // No project update should have been issued via tx
      expect(mockTxUpdate).not.toHaveBeenCalled();
      // No top-level update either
      expect(mockDbUpdate).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND for missing project', async () => {
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        // 1st select: getOrgIdForProject → [{ orgId }]
        if (selectCount === 1) return makeQueryChain([{ orgId }]);
        // 2nd select: project lookup → empty (not found)
        return makeQueryChain([]);
      });

      await expect(finishProject(projectId, actorId)).rejects.toThrow('Project not found');
    });

    it('returns existing state idempotently when project is already archived', async () => {
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        // 1st select: getOrgIdForProject → [{ orgId }]
        if (selectCount === 1) return makeQueryChain([{ orgId }]);
        // 2nd select: project lookup → already archived
        if (selectCount === 2) return makeQueryChain([archivedProject]);
        // 3rd select: getProject (called on idempotent return path)
        return makeQueryChain([archivedProject]);
      });

      const result = await finishProject(projectId, actorId);

      expect(result).toBeDefined();
      // Transaction should not be entered for idempotent path
      expect(mockDbTransaction).not.toHaveBeenCalled();
      // No activity log should have been written for idempotent return
      const { log } = await import('../activity.service.js');
      expect(log).not.toHaveBeenCalled();
    });

    it('throws FORBIDDEN when actor lacks update permission', async () => {
      mockHasOrgPermission.mockResolvedValue(false);

      // Need to return an org ID for the project so the permission check can proceed
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        // 1st select: getOrgIdForProject
        if (selectCount === 1) return makeQueryChain([{ orgId }]);
        // 2nd select: permission context org lookup
        return makeQueryChain([]);
      });

      await expect(finishProject(projectId, actorId)).rejects.toThrow(
        'Insufficient permissions to finish this project',
      );

      expect(mockDbTransaction).not.toHaveBeenCalled();
    });

    it('rejects with 422 when a task becomes non-final between initial check and transaction', async () => {
      // This test simulates the TOCTOU race: the initial (pre-tx) hasNonFinalTasks
      // check would have passed, but inside the transaction a concurrent task
      // change made a task non-final. The re-validation inside the tx catches it.
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        // 1st select: getOrgIdForProject → [{ orgId }]
        if (selectCount === 1) return makeQueryChain([{ orgId }]);
        // 2nd select: project lookup → active project
        if (selectCount === 2) return makeQueryChain([activeProject]);
        // Post-tx getProject — shouldn't be reached because tx will throw
        return makeQueryChain([{ ...activeProject, status: 'archived' }]);
      });

      // Transaction-scoped selects: re-validate finds a non-final task now
      let txSelectCount = 0;
      mockTxSelect.mockImplementation(() => {
        txSelectCount++;
        // 1st tx select: re-read project inside tx → still active
        if (txSelectCount === 1) return makeQueryChain([activeProject]);
        // 2nd tx select: hasNonFinalTasks via tx → NOW finds a non-final task
        // (simulating concurrent task status change between check and tx)
        return makeQueryChain([{ id: 'concurrent-non-final-task' }]);
      });

      await expect(finishProject(projectId, actorId)).rejects.toThrow(
        'Finish all open tasks before marking this project as finished.',
      );

      // tx.update should NOT have been called — project remains active
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });

    it('handles idempotent already-archived inside transaction', async () => {
      // Simulates: initial read shows 'active', but by the time the transaction
      // starts, a concurrent request has already set the project to 'archived'.
      let selectCount = 0;
      mockDbSelect.mockImplementation(() => {
        selectCount++;
        // 1st select: getOrgIdForProject
        if (selectCount === 1) return makeQueryChain([{ orgId }]);
        // 2nd select: project lookup → active (stale read)
        if (selectCount === 2) return makeQueryChain([activeProject]);
        // 3rd select: getProject (after tx) → now archived
        return makeQueryChain([archivedProject]);
      });

      // Transaction reads the project as already archived
      mockTxSelect.mockImplementation(() => makeQueryChain([archivedProject]));

      const result = await finishProject(projectId, actorId);

      expect(result).toBeDefined();
      // No update should be issued since project was already archived inside tx
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });
  });
});
