import type { WorkflowStatus } from '@/api/projects';
import { isStatusTransitionBlocked } from '@/api/tasks';
import type { Task, TaskWithRelations } from '@/api/tasks';
import { describe, expect, it } from 'vitest';

// ─── Helpers (pure logic extracted from KanbanBoard) ──────────────────────────

function groupTasksByStatus(tasks: Task[], statuses: WorkflowStatus[]): Map<string, Task[]> {
  const grouped = new Map<string, Task[]>();
  for (const status of statuses) {
    grouped.set(status.id, []);
  }
  for (const task of tasks) {
    const bucket = grouped.get(task.statusId);
    if (bucket) bucket.push(task);
  }
  // Sort each bucket by position
  for (const [, bucket] of grouped) {
    bucket.sort((a, b) => a.position - b.position);
  }
  return grouped;
}

function computeTargetPosition(
  tasks: Task[],
  overTaskId: string | null,
  columnTasks: Task[],
): number {
  if (!overTaskId) {
    return (columnTasks[columnTasks.length - 1]?.position ?? 0) + 1000;
  }
  const overTask = tasks.find((t) => t.id === overTaskId);
  return overTask?.position ?? (columnTasks[columnTasks.length - 1]?.position ?? 0) + 1000;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeTask = (overrides: Partial<Task> & { id: string; statusId: string }): Task => ({
  title: 'Task',
  description: undefined,
  priority: 'medium',
  position: 1000,
  projectId: 'proj-1',
  labels: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const statuses: WorkflowStatus[] = [
  { id: 'todo', name: 'To Do', color: '#64748B', position: 0, isDefault: true },
  { id: 'in_progress', name: 'In Progress', color: '#3B82F6', position: 1, isDefault: false },
  { id: 'done', name: 'Done', color: '#22C55E', position: 2, isDefault: false, isFinal: true },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('groupTasksByStatus', () => {
  it('creates an entry for every status even if empty', () => {
    const grouped = groupTasksByStatus([], statuses);
    expect(grouped.size).toBe(3);
    expect(grouped.get('todo')).toEqual([]);
    expect(grouped.get('in_progress')).toEqual([]);
    expect(grouped.get('done')).toEqual([]);
  });

  it('places tasks into the correct status bucket', () => {
    const tasks = [
      makeTask({ id: 't1', statusId: 'todo', position: 1000 }),
      makeTask({ id: 't2', statusId: 'in_progress', position: 1000 }),
      makeTask({ id: 't3', statusId: 'todo', position: 2000 }),
    ];
    const grouped = groupTasksByStatus(tasks, statuses);
    expect(grouped.get('todo')).toHaveLength(2);
    expect(grouped.get('in_progress')).toHaveLength(1);
    expect(grouped.get('done')).toHaveLength(0);
  });

  it('sorts tasks within each bucket by position ascending', () => {
    const tasks = [
      makeTask({ id: 't1', statusId: 'todo', position: 3000 }),
      makeTask({ id: 't2', statusId: 'todo', position: 1000 }),
      makeTask({ id: 't3', statusId: 'todo', position: 2000 }),
    ];
    const grouped = groupTasksByStatus(tasks, statuses);
    const todoTasks = grouped.get('todo');
    expect(todoTasks).toBeDefined();
    if (!todoTasks) throw new Error('todo status bucket missing');
    expect(todoTasks.map((t) => t.id)).toEqual(['t2', 't3', 't1']);
  });

  it('ignores tasks with unknown statusId', () => {
    const tasks = [makeTask({ id: 't1', statusId: 'nonexistent', position: 1000 })];
    const grouped = groupTasksByStatus(tasks, statuses);
    const total = [...grouped.values()].flat().length;
    expect(total).toBe(0);
  });
});

describe('computeTargetPosition', () => {
  it('places at end of column when no over task', () => {
    const columnTasks = [
      makeTask({ id: 't1', statusId: 'todo', position: 1000 }),
      makeTask({ id: 't2', statusId: 'todo', position: 2000 }),
    ];
    const pos = computeTargetPosition(columnTasks, null, columnTasks);
    expect(pos).toBe(3000);
  });

  it('places at position 1000 when column is empty', () => {
    const pos = computeTargetPosition([], null, []);
    expect(pos).toBe(1000);
  });

  it('uses over-task position when dropping onto a card', () => {
    const tasks = [
      makeTask({ id: 't1', statusId: 'todo', position: 1000 }),
      makeTask({ id: 't2', statusId: 'todo', position: 2000 }),
    ];
    const pos = computeTargetPosition(tasks, 't1', tasks);
    expect(pos).toBe(1000);
  });
});

describe('optimistic task move state update', () => {
  it('updates statusId and position for the moved task', () => {
    const tasks: Task[] = [
      makeTask({ id: 't1', statusId: 'todo', position: 1000 }),
      makeTask({ id: 't2', statusId: 'todo', position: 2000 }),
      makeTask({ id: 't3', statusId: 'in_progress', position: 1000 }),
    ];

    const updatedTasks = tasks.map((t) =>
      t.id === 't1' ? { ...t, statusId: 'in_progress', position: 500 } : t,
    );

    const t1 = updatedTasks.find((t) => t.id === 't1');
    expect(t1).toBeDefined();
    if (!t1) throw new Error('t1 not found');
    expect(t1.statusId).toBe('in_progress');
    expect(t1.position).toBe(500);

    const t2 = updatedTasks.find((t) => t.id === 't2');
    expect(t2).toBeDefined();
    if (!t2) throw new Error('t2 not found');
    expect(t2.statusId).toBe('todo');
    expect(t2.position).toBe(2000);
  });

  it('does not mutate original tasks array', () => {
    const original: Task[] = [makeTask({ id: 't1', statusId: 'todo', position: 1000 })];
    const updated = original.map((t) => (t.id === 't1' ? { ...t, statusId: 'done' } : t));

    expect(original[0].statusId).toBe('todo');
    expect(updated[0].statusId).toBe('done');
  });
});

// ─── Transition validation logic (unit tests) ──────────────────────────────────

describe('isStatusTransitionBlocked', () => {
  it('returns blocked=false for non-final, non-validated statuses', () => {
    const task: TaskWithRelations = makeTask({
      id: 't1',
      statusId: 'todo',
    }) as TaskWithRelations;
    const inProgress = statuses.find((s) => s.id === 'in_progress');
    if (!inProgress) throw new Error('in_progress status not found in fixture');
    const result = isStatusTransitionBlocked(task, inProgress);
    expect(result.blocked).toBe(false);
  });

  it('returns blocked=true for isFinal status with unresolved blockers', () => {
    const task: TaskWithRelations = {
      ...makeTask({ id: 't1', statusId: 'todo' }),
      blockers: [{ isResolved: false }],
    };
    const doneStatus = statuses.find((s) => s.id === 'done');
    if (!doneStatus) throw new Error('done status not found in fixture');
    const result = isStatusTransitionBlocked(task, doneStatus);
    expect(result.blocked).toBe(true);
    expect(result.blockersCount).toBe(1);
  });

  it('returns blocked=false for isFinal status with all blockers resolved', () => {
    const task: TaskWithRelations = {
      ...makeTask({ id: 't1', statusId: 'todo' }),
      blockers: [{ isResolved: true }],
    };
    const doneStatus = statuses.find((s) => s.id === 'done');
    if (!doneStatus) throw new Error('done status not found in fixture');
    const result = isStatusTransitionBlocked(task, doneStatus);
    expect(result.blocked).toBe(false);
  });

  it('returns blocked=true for isValidated status with incomplete checklists', () => {
    const task: TaskWithRelations = {
      ...makeTask({ id: 't1', statusId: 'todo' }),
      blockers: [],
      progress: {
        subtaskCount: 3,
        subtaskCompletedCount: 1,
        checklistTotal: 5,
        checklistCompleted: 2,
      },
    };
    const validatedStatus: WorkflowStatus = {
      id: 'released',
      name: 'Released',
      color: '#a855f7',
      position: 3,
      isDefault: false,
      isValidated: true,
    };
    const result = isStatusTransitionBlocked(task, validatedStatus);
    expect(result.blocked).toBe(true);
    expect(result.checklistCount).toBe(3);
  });

  it('returns blocked=false for isFinal task with no blockers and complete checklists', () => {
    const task: TaskWithRelations = {
      ...makeTask({ id: 't1', statusId: 'todo' }),
      blockers: [{ isResolved: true }],
      progress: {
        subtaskCount: 2,
        subtaskCompletedCount: 2,
        checklistTotal: 3,
        checklistCompleted: 3,
      },
    };
    const doneStatus = statuses.find((s) => s.id === 'done');
    if (!doneStatus) throw new Error('done status not found in fixture');
    const result = isStatusTransitionBlocked(task, doneStatus);
    expect(result.blocked).toBe(false);
  });
});

describe('kanban drag transition blocking', () => {
  it('shows INFO toast when dragging to a final column with unresolved blockers', async () => {
    // Simulating the same logic used in handleDragEnd
    const { getBlockedStatusTransitionMessage } = await import('@/api/tasks');
    const task: TaskWithRelations = {
      ...makeTask({ id: 't1', statusId: 'in_progress' }),
      blockers: [{ isResolved: false }, { isResolved: true }],
    };
    const targetStatus = statuses.find((s) => s.id === 'done');
    if (!targetStatus) throw new Error('done status not found in fixture');
    const eligibility = isStatusTransitionBlocked(task, targetStatus);

    expect(eligibility.blocked).toBe(true);

    const message = getBlockedStatusTransitionMessage(targetStatus.name, eligibility);
    expect(message).toBe(
      'Cannot move to Done: 1 unresolved blocker(s), 0 incomplete checklist item(s)',
    );
  });

  it('does not block transition to a non-final column', () => {
    const task: TaskWithRelations = {
      ...makeTask({ id: 't1', statusId: 'todo' }),
      blockers: [{ isResolved: false }],
    };
    const inProgress = statuses.find((s) => s.id === 'in_progress');
    if (!inProgress) throw new Error('in_progress status not found in fixture');
    const eligibility = isStatusTransitionBlocked(task, inProgress);
    expect(eligibility.blocked).toBe(false);
  });
});
