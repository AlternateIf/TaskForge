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
import { PickerPopover } from '@/components/data/task-inline-editors';
import { TaskRow } from '@/components/data/task-row';
import { PriorityBadge } from '@/components/priority-badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { TASK_UPDATE_PERMISSION } from '@taskforge/shared';
import { ChevronDown, ChevronUp, ChevronsUpDown, ClipboardList, Loader2, X } from 'lucide-react';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

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
  canEditTask?: boolean;
  canCreateTask?: boolean;
  onCreateTask?: () => void;
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

// ─── Bulk Dropdown ────────────────────────────────────────────────────────────

function BulkDropdown({
  label,
  children,
}: {
  label: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <PickerPopover
      open={open}
      onClose={close}
      className="min-w-40 p-xs"
      trigger={
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-8 items-center gap-xs rounded-radius-md border border-border bg-surface-container-lowest px-sm text-body text-foreground transition-colors hover:border-brand-primary"
        >
          {label}
          <ChevronDown className="size-3 text-muted" />
        </button>
      }
    >
      {children(close)}
    </PickerPopover>
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
  canEditTask = true,
  canCreateTask = true,
  onCreateTask,
}: TaskTableProps) {
  const user = useAuthStore((state) => state.user);
  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);
  const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);

  const [internalFilters, setInternalFilters] = useState<TaskFilters>({});
  const filters = externalFilters ?? internalFilters;
  const setFilters = externalOnFiltersChange ?? setInternalFilters;
  const [sort, setSort] = useState<{ field: SortField; order: SortOrder }>({
    field: 'createdAt',
    order: 'desc',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      {canUpdateTask && selectedIds.size > 0 && (
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
            <BulkDropdown label="Set status…">
              {(close) =>
                statuses.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-center gap-sm rounded-radius-md px-sm py-xs text-body transition-colors hover:bg-surface-container-low"
                    onClick={() => {
                      applyBulkUpdate({ statusId: s.id });
                      close();
                    }}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </button>
                ))
              }
            </BulkDropdown>
            {/* Bulk priority */}
            <BulkDropdown label="Set priority…">
              {(close) =>
                ALL_PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="flex w-full items-center rounded-radius-md px-sm py-xs text-body transition-colors hover:bg-surface-container-low"
                    onClick={() => {
                      applyBulkUpdate({ priority: p });
                      close();
                    }}
                  >
                    <PriorityBadge priority={p} showDot showLabel />
                  </button>
                ))
              }
            </BulkDropdown>
            {/* Bulk assignee */}
            {members.length > 0 && (
              <BulkDropdown label="Assign to…">
                {(close) =>
                  members.map((m) => (
                    <button
                      key={m.userId}
                      type="button"
                      className="flex w-full items-center gap-sm rounded-radius-md px-sm py-xs text-body transition-colors hover:bg-surface-container-low"
                      onClick={() => {
                        applyBulkUpdate({ assigneeId: m.userId });
                        close();
                      }}
                    >
                      <Avatar name={m.displayName} userId={m.userId} size="sm" />
                      <span className="line-clamp-1 text-left">{m.displayName}</span>
                    </button>
                  ))
                }
              </BulkDropdown>
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
                  disabled={!canUpdateTask}
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
                    <EmptyNoTasks onCreate={canCreateTask ? onCreateTask : undefined} />
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
                  canEditTask={canUpdateTask}
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
