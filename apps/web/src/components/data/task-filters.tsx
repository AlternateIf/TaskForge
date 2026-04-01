import type { Label, ProjectMember, WorkflowStatus } from '@/api/projects';
import type { SortField, SortOrder, TaskFilters } from '@/api/tasks';
import type { Priority } from '@/api/tasks';
import { PriorityBadge } from '@/components/priority-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Filter, Search, X } from 'lucide-react';
import { useState } from 'react';

const ALL_PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low', 'none'];

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  sort?: { field: SortField; order: SortOrder };
  onSortChange?: (sort: { field: SortField; order: SortOrder }) => void;
  statuses: WorkflowStatus[];
  members: ProjectMember[];
  labels: Label[];
}

function hasActiveFilters(filters: TaskFilters): boolean {
  return !!(
    filters.search ||
    filters.statusId?.length ||
    filters.priority?.length ||
    filters.assigneeId?.length ||
    filters.labelId?.length ||
    filters.dueDateFrom ||
    filters.dueDateTo
  );
}

export function TaskFiltersBar({
  filters,
  onFiltersChange,
  statuses,
  members,
  labels,
}: TaskFiltersBarProps) {
  const [expanded, setExpanded] = useState(false);
  const active = hasActiveFilters(filters);

  function toggleStatus(id: string) {
    const current = Array.isArray(filters.statusId)
      ? filters.statusId
      : filters.statusId
        ? [filters.statusId]
        : [];
    const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id];
    onFiltersChange({ ...filters, statusId: next.length ? next : undefined });
  }

  function togglePriority(p: Priority) {
    const current = Array.isArray(filters.priority)
      ? filters.priority
      : filters.priority
        ? [filters.priority]
        : [];
    const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
    onFiltersChange({ ...filters, priority: next.length ? next : undefined });
  }

  function toggleAssignee(id: string) {
    const current = Array.isArray(filters.assigneeId)
      ? filters.assigneeId
      : filters.assigneeId
        ? [filters.assigneeId]
        : [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onFiltersChange({ ...filters, assigneeId: next.length ? next : undefined });
  }

  function toggleLabel(id: string) {
    const current = Array.isArray(filters.labelId)
      ? filters.labelId
      : filters.labelId
        ? [filters.labelId]
        : [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onFiltersChange({ ...filters, labelId: next.length ? next : undefined });
  }

  const statusIds = Array.isArray(filters.statusId)
    ? filters.statusId
    : filters.statusId
      ? [filters.statusId]
      : [];
  const priorityValues = Array.isArray(filters.priority)
    ? filters.priority
    : filters.priority
      ? [filters.priority]
      : [];
  const assigneeIds = Array.isArray(filters.assigneeId)
    ? filters.assigneeId
    : filters.assigneeId
      ? [filters.assigneeId]
      : [];
  const labelIds = Array.isArray(filters.labelId)
    ? filters.labelId
    : filters.labelId
      ? [filters.labelId]
      : [];

  return (
    <div className="flex flex-col gap-sm">
      {/* Search + toggle row */}
      <div className="flex items-center gap-sm">
        <div className="relative flex-1">
          <Search className="absolute left-sm top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search tasks…"
            value={filters.search ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
            className="h-9 w-full rounded-radius-md border border-border bg-surface-container-lowest pl-9 pr-sm text-body focus:outline-2 focus:outline-ring"
            aria-label="Search tasks"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label="Toggle filters"
          className={cn(active && 'text-brand-primary')}
        >
          <Filter className="size-4" />
          Filters
          {active && (
            <span className="ml-xs flex size-4 items-center justify-center rounded-full bg-brand-primary text-[10px] text-white">
              !
            </span>
          )}
        </Button>
        {active && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({})}
            aria-label="Clear all filters"
          >
            <X className="size-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Expandable filter panel */}
      {expanded && (
        <div className="rounded-radius-lg border border-border bg-surface-container-lowest p-md">
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
            {/* Status */}
            {statuses.length > 0 && (
              <div className="flex flex-col gap-xs">
                <span className="text-label font-semibold uppercase tracking-widest text-muted">
                  Status
                </span>
                <div className="flex flex-col gap-xs">
                  {statuses.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-xs">
                      <input
                        type="checkbox"
                        checked={statusIds.includes(s.id)}
                        onChange={() => toggleStatus(s.id)}
                        className="rounded-radius-sm accent-brand-primary"
                      />
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                        aria-hidden
                      />
                      <span className="text-body">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Priority */}
            <div className="flex flex-col gap-xs">
              <span className="text-label font-semibold uppercase tracking-widest text-muted">
                Priority
              </span>
              <div className="flex flex-col gap-xs">
                {ALL_PRIORITIES.map((p) => (
                  <label key={p} className="flex cursor-pointer items-center gap-xs">
                    <input
                      type="checkbox"
                      checked={priorityValues.includes(p)}
                      onChange={() => togglePriority(p)}
                      className="rounded-radius-sm accent-brand-primary"
                    />
                    <PriorityBadge priority={p} showLabel showDot />
                  </label>
                ))}
              </div>
            </div>

            {/* Assignee */}
            {members.length > 0 && (
              <div className="flex flex-col gap-xs">
                <span className="text-label font-semibold uppercase tracking-widest text-muted">
                  Assignee
                </span>
                <div className="flex flex-col gap-xs">
                  {members.map((m) => (
                    <label key={m.userId} className="flex cursor-pointer items-center gap-xs">
                      <input
                        type="checkbox"
                        checked={assigneeIds.includes(m.userId)}
                        onChange={() => toggleAssignee(m.userId)}
                        className="rounded-radius-sm accent-brand-primary"
                      />
                      <span className="text-body">{m.displayName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Labels */}
            {labels.length > 0 && (
              <div className="flex flex-col gap-xs">
                <span className="text-label font-semibold uppercase tracking-widest text-muted">
                  Labels
                </span>
                <div className="flex flex-col gap-xs">
                  {labels.map((l) => (
                    <label key={l.id} className="flex cursor-pointer items-center gap-xs">
                      <input
                        type="checkbox"
                        checked={labelIds.includes(l.id)}
                        onChange={() => toggleLabel(l.id)}
                        className="rounded-radius-sm accent-brand-primary"
                      />
                      <span
                        className="inline-flex items-center gap-xs rounded-full px-sm py-0.5 text-label font-medium"
                        style={{ backgroundColor: `${l.color}22`, color: l.color }}
                      >
                        {l.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="mt-md flex flex-wrap items-center gap-sm">
            <span className="text-label font-semibold uppercase tracking-widest text-muted">
              Due date
            </span>
            <input
              type="date"
              value={filters.dueDateFrom ?? ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, dueDateFrom: e.target.value || undefined })
              }
              className="h-8 rounded-radius-md border border-border bg-surface-container-lowest px-sm text-body focus:outline-2 focus:outline-ring"
              aria-label="Due date from"
            />
            <span className="text-muted">–</span>
            <input
              type="date"
              value={filters.dueDateTo ?? ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, dueDateTo: e.target.value || undefined })
              }
              className="h-8 rounded-radius-md border border-border bg-surface-container-lowest px-sm text-body focus:outline-2 focus:outline-ring"
              aria-label="Due date to"
            />
          </div>
        </div>
      )}
    </div>
  );
}
