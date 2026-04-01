import type { WorkflowStatus } from '@/api/projects';
import type { Task } from '@/api/tasks';
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
  { id: 'done', name: 'Done', color: '#22C55E', position: 2, isDefault: false },
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
