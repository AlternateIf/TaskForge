import type { Label, ProjectMember, WorkflowStatus } from '@/api/projects';
import {
  type BulkUpdatePayload,
  type SortField,
  type SortOrder,
  type Task,
  type TaskFilters,
  useBulkUpdateTasks,
  useInfiniteTasks,
} from '@/api/tasks';
import { TaskFiltersBar } from '@/components/data/task-filters';
import { TaskRow } from '@/components/data/task-row';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, ChevronsUpDown, ClipboardList, Loader2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type Priority = 'critical' | 'high' | 'medium' | 'low' | 'none';
const ALL_PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low', 'none'];

interface TaskTableProps {
  projectId: string;
  statuses: WorkflowStatus[];
  members: ProjectMember[];
  labels: Label[];
  onTaskClick: (taskId: string) => void;
  filters?: TaskFilters;
  onFiltersChange?: (filters: TaskFilters) => void;
}

interface ColumnDef {
  key: SortField | 'labels' | 'checkbox';
  label: string;
  sortable: boolean;
  className?: string;
}

const COLUMNS: ColumnDef[] = [
  { key: 'checkbox', label: '', sortable: false, className: 'w-10' },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'status', label: 'Status', sortable: true, className: 'hidden sm:table-cell' },
  { key: 'priority', label: 'Priority', sortable: true, className: 'hidden md:table-cell' },
  { key: 'assignee', label: 'Assignee', sortable: true, className: 'hidden lg:table-cell' },
  { key: 'dueDate', label: 'Due', sortable: true, className: 'hidden xl:table-cell' },
  { key: 'labels', label: 'Labels', sortable: false, className: 'hidden xl:table-cell' },
];

function SortIcon({
  field,
  sort,
}: { field: SortField; sort?: { field: SortField; order: SortOrder } }) {
  if (sort?.field !== field) return <ChevronsUpDown className="size-3.5 text-muted" />;
  return sort.order === 'asc' ? (
    <ChevronUp className="size-3.5 text-brand-primary" />
  ) : (
    <ChevronDown className="size-3.5 text-brand-primary" />
  );
}

// ─── Empty States ──────────────────────────────────────────────────────────────

function EmptyNoTasks({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ClipboardList className="mb-lg size-12 text-muted" strokeWidth={1} />
      <p className="mb-xs text-heading-3 font-semibold text-foreground">No tasks yet</p>
      <p className="mb-lg text-body text-secondary">Get started by creating your first task.</p>
      {onCreate && (
        <Button variant="primary" onClick={onCreate}>
          Create Task
        </Button>
      )}
    </div>
  );
}

function EmptyNoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="mb-xs text-heading-3 font-semibold text-foreground">
        No tasks match your filters
      </p>
      <p className="mb-lg text-body text-secondary">Try adjusting or clearing your filters.</p>
      <Button variant="secondary" onClick={onClear}>
        <X className="size-4" />
        Clear filters
      </Button>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  const skeletonRows = Array.from({ length: 10 }, (_unused, index) => `skeleton-${index + 1}`);
  return (
    <tbody>
      {skeletonRows.map((rowKey) => (
        <tr key={rowKey} className="border-b border-border">
          <td className="px-md py-sm">
            <Skeleton className="size-4 rounded" />
          </td>
          <td className="px-sm py-sm">
            <Skeleton className="h-4 w-3/4 rounded" />
          </td>
          <td className="hidden px-sm py-sm sm:table-cell">
            <Skeleton className="h-5 w-20 rounded-full" />
          </td>
          <td className="hidden px-sm py-sm md:table-cell">
            <Skeleton className="h-5 w-16 rounded-full" />
          </td>
          <td className="hidden px-sm py-sm lg:table-cell">
            <Skeleton className="h-4 w-24 rounded" />
          </td>
          <td className="hidden px-sm py-sm xl:table-cell">
            <Skeleton className="h-4 w-16 rounded" />
          </td>
          <td className="hidden px-sm py-sm xl:table-cell">
            <Skeleton className="h-5 w-20 rounded-full" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TaskTable({
  projectId,
  statuses,
  members,
  labels,
  onTaskClick,
  filters: externalFilters,
  onFiltersChange: externalOnFiltersChange,
}: TaskTableProps) {
  const [internalFilters, setInternalFilters] = useState<TaskFilters>({});
  const filters = externalFilters ?? internalFilters;
  const setFilters = externalOnFiltersChange ?? setInternalFilters;
  const [sort, setSort] = useState<{ field: SortField; order: SortOrder }>({
    field: 'createdAt',
    order: 'desc',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPriority, setBulkPriority] = useState<Priority | ''>('');
  const [bulkAssignee, setBulkAssignee] = useState('');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteTasks(
    projectId,
    filters,
    sort,
  );
  const bulkUpdate = useBulkUpdateTasks();

  const allTasks = useMemo(() => (data?.pages.flatMap((p) => p.data) ?? []) as Task[], [data]);

  const hasActiveFilters = !!(
    filters.search ||
    filters.statusId?.length ||
    filters.priority?.length ||
    filters.assigneeId?.length ||
    filters.labelId?.length ||
    filters.dueDateFrom ||
    filters.dueDateTo
  );

  function toggleSort(field: SortField) {
    setSort((prev) =>
      prev.field === field
        ? { field, order: prev.order === 'asc' ? 'desc' : 'asc' }
        : { field, order: 'asc' },
    );
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === allTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allTasks.map((t) => t.id)));
    }
  }

  function applyBulkUpdate(payload: Partial<BulkUpdatePayload['data']>) {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    bulkUpdate.mutate(
      { ids, data: payload, projectId },
      { onSuccess: () => setSelectedIds(new Set()) },
    );
  }

  const allSelected = allTasks.length > 0 && selectedIds.size === allTasks.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="flex flex-col gap-md">
      {!externalFilters && (
        <TaskFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
          statuses={statuses}
          members={members}
          labels={labels}
        />
      )}

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div
          className={cn(
            'z-10 flex flex-wrap items-center gap-sm rounded-radius-lg border border-border bg-surface-container p-sm shadow-2',
            'sticky top-14 md:static',
            // On mobile: fixed bottom
            'max-md:fixed max-md:bottom-20 max-md:left-md max-md:right-md max-md:top-auto',
          )}
          role="toolbar"
          aria-label="Bulk actions"
        >
          <span className="text-body font-medium text-foreground">
            {selectedIds.size} task{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-sm">
            {/* Bulk status */}
            <select
              value={bulkStatus}
              onChange={(e) => {
                setBulkStatus(e.target.value);
                if (e.target.value) applyBulkUpdate({ statusId: e.target.value });
              }}
              className="h-8 rounded-radius-md border border-border bg-surface-container-lowest px-sm text-body focus:outline-2 focus:outline-ring"
              aria-label="Set status for selected"
            >
              <option value="">Set status…</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {/* Bulk priority */}
            <select
              value={bulkPriority}
              onChange={(e) => {
                const p = e.target.value as Priority | '';
                setBulkPriority(p);
                if (p) applyBulkUpdate({ priority: p });
              }}
              className="h-8 rounded-radius-md border border-border bg-surface-container-lowest px-sm text-body focus:outline-2 focus:outline-ring"
              aria-label="Set priority for selected"
            >
              <option value="">Set priority…</option>
              {ALL_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
            {/* Bulk assignee */}
            {members.length > 0 && (
              <select
                value={bulkAssignee}
                onChange={(e) => {
                  setBulkAssignee(e.target.value);
                  if (e.target.value) applyBulkUpdate({ assigneeId: e.target.value });
                }}
                className="h-8 rounded-radius-md border border-border bg-surface-container-lowest px-sm text-body focus:outline-2 focus:outline-ring"
                aria-label="Set assignee for selected"
              >
                <option value="">Assign to…</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              aria-label="Clear selection"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-radius-lg border border-border">
        <table className="w-full min-w-150 border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-container-low">
              <th className="w-10 px-md py-sm">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="rounded accent-brand-primary"
                  aria-label={allSelected ? 'Deselect all' : 'Select all'}
                />
              </th>
              {COLUMNS.slice(1).map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-sm py-sm text-left text-label font-semibold uppercase tracking-widest text-muted',
                    col.className,
                    col.sortable && 'cursor-pointer select-none hover:text-foreground',
                  )}
                  aria-sort={
                    col.sortable && sort.field === col.key
                      ? sort.order === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : col.sortable
                        ? 'none'
                        : undefined
                  }
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key as SortField)}
                      className="inline-flex items-center gap-xs"
                    >
                      {col.label}
                      <SortIcon field={col.key as SortField} sort={sort} />
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-xs">{col.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {isLoading ? (
            <TableSkeleton />
          ) : allTasks.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={COLUMNS.length} className="p-0">
                  {hasActiveFilters ? (
                    <EmptyNoResults onClear={() => setFilters({})} />
                  ) : (
                    <EmptyNoTasks />
                  )}
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {allTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  statuses={statuses}
                  members={members}
                  allLabels={labels}
                  selected={selectedIds.has(task.id)}
                  onSelect={() => toggleSelect(task.id)}
                  onClick={() => onTaskClick(task.id)}
                />
              ))}
            </tbody>
          )}
        </table>
      </div>

      {/* Load more */}
      {hasNextPage && (
        <div className="flex justify-center py-sm">
          <Button
            variant="secondary"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && <Loader2 className="size-4 animate-spin" />}
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
