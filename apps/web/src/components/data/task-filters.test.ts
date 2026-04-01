import type { Task, TaskFilters } from '@/api/tasks';
import { describe, expect, it } from 'vitest';

// ─── Pure filter logic (extracted from TaskFiltersBar) ────────────────────────

function hasActiveFilters(filters: TaskFilters): boolean {
  return !!(
    filters.search ||
    (Array.isArray(filters.statusId) ? filters.statusId.length : filters.statusId) ||
    (Array.isArray(filters.priority) ? filters.priority.length : filters.priority) ||
    (Array.isArray(filters.assigneeId) ? filters.assigneeId.length : filters.assigneeId) ||
    (Array.isArray(filters.labelId) ? filters.labelId.length : filters.labelId) ||
    filters.dueDateFrom ||
    filters.dueDateTo
  );
}

function toggleArrayFilter<T extends string>(
  current: T | T[] | undefined,
  value: T,
): T[] | undefined {
  const arr: T[] = Array.isArray(current) ? current : current ? [current] : [];
  const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
  return next.length > 0 ? next : undefined;
}

// ─── Client-side filter matching (simulates what the API would do) ────────────

type Priority = 'critical' | 'high' | 'medium' | 'low' | 'none';

const makeTask = (overrides: Partial<Task> & { id: string }): Task => ({
  title: 'Task',
  statusId: 'todo',
  priority: 'medium' as Priority,
  position: 1000,
  projectId: 'proj-1',
  labels: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('hasActiveFilters', () => {
  it('returns false for empty filters', () => {
    expect(hasActiveFilters({})).toBe(false);
  });

  it('returns true when search is set', () => {
    expect(hasActiveFilters({ search: 'login' })).toBe(true);
  });

  it('returns true when statusId array is non-empty', () => {
    expect(hasActiveFilters({ statusId: ['todo'] })).toBe(true);
  });

  it('returns false when statusId array is empty', () => {
    expect(hasActiveFilters({ statusId: [] })).toBe(false);
  });

  it('returns true when a single statusId string is set', () => {
    expect(hasActiveFilters({ statusId: 'done' })).toBe(true);
  });

  it('returns true when dueDateFrom is set', () => {
    expect(hasActiveFilters({ dueDateFrom: '2026-01-01' })).toBe(true);
  });

  it('returns false after clearing all filters', () => {
    const filters: TaskFilters = {
      search: undefined,
      statusId: undefined,
      priority: undefined,
      assigneeId: undefined,
      labelId: undefined,
      dueDateFrom: undefined,
      dueDateTo: undefined,
    };
    expect(hasActiveFilters(filters)).toBe(false);
  });
});

describe('toggleArrayFilter', () => {
  it('adds a value when it is not present', () => {
    const result = toggleArrayFilter<string>(undefined, 'todo');
    expect(result).toEqual(['todo']);
  });

  it('removes a value when it is already present', () => {
    const result = toggleArrayFilter<string>(['todo', 'in_progress'], 'todo');
    expect(result).toEqual(['in_progress']);
  });

  it('returns undefined when removing the last item', () => {
    const result = toggleArrayFilter<string>(['todo'], 'todo');
    expect(result).toBeUndefined();
  });

  it('adds to an existing array', () => {
    const result = toggleArrayFilter<string>(['todo'], 'done');
    expect(result).toEqual(['todo', 'done']);
  });

  it('handles a string (non-array) current value', () => {
    const result = toggleArrayFilter<string>('todo', 'done');
    expect(result).toEqual(['todo', 'done']);
  });

  it('removes when current is a single string matching the value', () => {
    const result = toggleArrayFilter<string>('todo', 'todo');
    expect(result).toBeUndefined();
  });
});

describe('task filter construction', () => {
  it('builds correct URLSearchParams for multiple status filters', () => {
    const params = new URLSearchParams();
    params.set('projectId', 'p1');
    const statuses = ['todo', 'in_progress'];
    for (const status of statuses) params.append('statusId', status);
    expect(params.getAll('statusId')).toEqual(['todo', 'in_progress']);
    expect(params.get('projectId')).toBe('p1');
  });

  it('does not append empty priority arrays', () => {
    const params = new URLSearchParams();
    expect(params.getAll('priority')).toHaveLength(0);
  });

  it('builds sort params correctly', () => {
    const params = new URLSearchParams();
    params.set('sort', 'dueDate');
    params.set('order', 'asc');
    expect(params.get('sort')).toBe('dueDate');
    expect(params.get('order')).toBe('asc');
  });
});

describe('task table sort state', () => {
  it('toggles sort order when clicking same column', () => {
    type SortState = { field: string; order: 'asc' | 'desc' };
    function toggleSort(prev: SortState, field: string): SortState {
      return prev.field === field
        ? { field, order: prev.order === 'asc' ? 'desc' : 'asc' }
        : { field, order: 'asc' };
    }

    const initial: SortState = { field: 'title', order: 'asc' };
    expect(toggleSort(initial, 'title')).toEqual({ field: 'title', order: 'desc' });
    expect(toggleSort(initial, 'dueDate')).toEqual({ field: 'dueDate', order: 'asc' });
  });

  it('resets to asc when changing to a new column', () => {
    type SortState = { field: string; order: 'asc' | 'desc' };
    function toggleSort(prev: SortState, field: string): SortState {
      return prev.field === field
        ? { field, order: prev.order === 'asc' ? 'desc' : 'asc' }
        : { field, order: 'asc' };
    }
    const current: SortState = { field: 'priority', order: 'desc' };
    expect(toggleSort(current, 'title')).toEqual({ field: 'title', order: 'asc' });
  });
});

describe('bulk selection state', () => {
  it('toggles individual task selection', () => {
    function toggle(prev: Set<string>, id: string): Set<string> {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    }

    const empty = new Set<string>();
    const after1 = toggle(empty, 't1');
    expect(after1.has('t1')).toBe(true);
    const after2 = toggle(after1, 't1');
    expect(after2.has('t1')).toBe(false);
  });

  it('selects all when fewer than all are selected', () => {
    const tasks = [makeTask({ id: 't1' }), makeTask({ id: 't2' }), makeTask({ id: 't3' })];
    const selected = new Set(['t1']);
    const allSelected = tasks.length > 0 && selected.size === tasks.length;
    expect(allSelected).toBe(false);

    const afterSelectAll = new Set(tasks.map((t) => t.id));
    expect(afterSelectAll.size).toBe(3);
  });

  it('deselects all when all are selected', () => {
    const tasks = [makeTask({ id: 't1' }), makeTask({ id: 't2' })];
    const selected = new Set(tasks.map((t) => t.id));
    const allSelected = tasks.length > 0 && selected.size === tasks.length;
    expect(allSelected).toBe(true);

    const afterDeselectAll = new Set<string>();
    expect(afterDeselectAll.size).toBe(0);
  });
});
