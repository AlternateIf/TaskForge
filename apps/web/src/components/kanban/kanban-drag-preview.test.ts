import type { Task } from '@/api/tasks';
import {
  type DragPreviewSnapshot,
  areTaskMapsEquivalent,
  computeDragPreviewUpdate,
  findTaskStatusId,
} from '@/components/kanban/kanban-drag-preview';
import { describe, expect, it } from 'vitest';

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

function toMap(columns: Record<string, Task[]>): Map<string, Task[]> {
  return new Map(Object.entries(columns));
}

describe('findTaskStatusId', () => {
  it('returns the status id that contains the task', () => {
    const map = toMap({
      todo: [makeTask({ id: 't1', statusId: 'todo' })],
      done: [makeTask({ id: 't2', statusId: 'done' })],
    });

    expect(findTaskStatusId(map, 't2')).toBe('done');
  });

  it('returns undefined when task is not present', () => {
    const map = toMap({
      todo: [makeTask({ id: 't1', statusId: 'todo' })],
    });

    expect(findTaskStatusId(map, 'missing')).toBeUndefined();
  });
});

describe('areTaskMapsEquivalent', () => {
  it('returns true for equivalent maps', () => {
    const a = toMap({
      todo: [makeTask({ id: 't1', statusId: 'todo' }), makeTask({ id: 't2', statusId: 'todo' })],
    });
    const b = toMap({
      todo: [makeTask({ id: 't1', statusId: 'todo' }), makeTask({ id: 't2', statusId: 'todo' })],
    });

    expect(areTaskMapsEquivalent(a, b)).toBe(true);
  });

  it('returns false when ordering differs', () => {
    const a = toMap({
      todo: [makeTask({ id: 't1', statusId: 'todo' }), makeTask({ id: 't2', statusId: 'todo' })],
    });
    const b = toMap({
      todo: [makeTask({ id: 't2', statusId: 'todo' }), makeTask({ id: 't1', statusId: 'todo' })],
    });

    expect(areTaskMapsEquivalent(a, b)).toBe(false);
  });
});

describe('computeDragPreviewUpdate', () => {
  const base = toMap({
    todo: [
      makeTask({ id: 't1', statusId: 'todo', position: 1000 }),
      makeTask({ id: 't2', statusId: 'todo', position: 2000 }),
    ],
    done: [makeTask({ id: 't3', statusId: 'done', position: 1000 })],
  });

  function run(snapshot: DragPreviewSnapshot, lastPreviewKey: string | null = null) {
    return computeDragPreviewUpdate({ base, snapshot, lastPreviewKey });
  }

  it('moves task across columns when target differs', () => {
    const result = run({
      draggedTaskId: 't1',
      targetStatusId: 'done',
      overTaskId: null,
      originalStatusId: 'todo',
    });

    expect(result.changed).toBe(true);
    if (!result.changed) throw new Error('Expected changed result');

    expect(result.next.get('todo')?.map((t) => t.id)).toEqual(['t2']);
    expect(result.next.get('done')?.map((t) => t.id)).toEqual(['t3', 't1']);
    expect(result.previewKey).toBe('t1|todo|done|column');
  });

  it('returns unchanged for native within-column drag-over', () => {
    const result = run({
      draggedTaskId: 't1',
      targetStatusId: 'todo',
      overTaskId: 't2',
      originalStatusId: 'todo',
    });

    expect(result.changed).toBe(false);
  });

  it('returns unchanged when hovering over the dragged task itself', () => {
    const result = run({
      draggedTaskId: 't1',
      targetStatusId: 'done',
      overTaskId: 't1',
      originalStatusId: 'todo',
    });

    expect(result.changed).toBe(false);
  });

  it('returns unchanged when preview key already applied', () => {
    const result = run(
      {
        draggedTaskId: 't1',
        targetStatusId: 'done',
        overTaskId: null,
        originalStatusId: 'todo',
      },
      't1|todo|done|column',
    );

    expect(result.changed).toBe(false);
  });
});
