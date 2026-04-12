import type { Project } from '@/api/projects';
import type { Priority, TaskFilters } from '@/api/tasks';
import { PriorityBadge } from '@/components/priority-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { Filter, Kanban, LayoutList, Search, Settings, X } from 'lucide-react';
import { useState } from 'react';

const ALL_PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low', 'none'];

interface ProjectToolbarProps {
  project: Project | undefined;
  isLoading: boolean;
  projectId: string;
  activeView: 'board' | 'list';
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  canViewSettings?: boolean;
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

function toArray<T>(val: T | T[] | undefined): T[] {
  if (Array.isArray(val)) return val;
  if (val != null) return [val];
  return [];
}

export function ProjectToolbar({
  project,
  isLoading,
  projectId,
  activeView,
  filters,
  onFiltersChange,
  canViewSettings = true,
}: ProjectToolbarProps) {
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);

  const active = hasActiveFilters(filters);
  const statuses = project?.statuses ?? [];
  const members = project?.members ?? [];
  const labels = project?.labels ?? [];

  const statusIds = toArray(filters.statusId);
  const priorityValues = toArray(filters.priority);
  const assigneeIds = toArray(filters.assigneeId);
  const labelIds = toArray(filters.labelId);

  function toggleStatus(id: string) {
    const next = statusIds.includes(id) ? statusIds.filter((s) => s !== id) : [...statusIds, id];
    onFiltersChange({ ...filters, statusId: next.length ? next : undefined });
  }

  function togglePriority(p: Priority) {
    const next = priorityValues.includes(p)
      ? priorityValues.filter((x) => x !== p)
      : [...priorityValues, p];
    onFiltersChange({ ...filters, priority: next.length ? next : undefined });
  }

  function toggleAssignee(id: string) {
    const next = assigneeIds.includes(id)
      ? assigneeIds.filter((x) => x !== id)
      : [...assigneeIds, id];
    onFiltersChange({ ...filters, assigneeId: next.length ? next : undefined });
  }

  function toggleLabel(id: string) {
    const next = labelIds.includes(id) ? labelIds.filter((x) => x !== id) : [...labelIds, id];
    onFiltersChange({ ...filters, labelId: next.length ? next : undefined });
  }

  function switchView(view: 'board' | 'list') {
    localStorage.setItem(`tf:project:${projectId}:view`, view);
    void navigate({
      to: `/projects/$projectId/${view}`,
      params: { projectId },
      search: (prev) => ({ ...prev, task: undefined }),
    });
  }

  function navigateToSettings() {
    void navigate({ to: '/projects/$projectId/settings', params: { projectId } });
  }

  return (
    <div className="shrink-0">
      {/* ── Compact toolbar row ─────────────────────────────────────────────── */}
      <div className="flex h-12 items-center gap-sm border-b border-border bg-surface-container-lowest px-lg">
        {isLoading ? (
          <>
            <div className="flex items-center gap-sm">
              <Skeleton className="size-2.5 rounded-full" />
              <Skeleton className="h-4 w-36 rounded" />
            </div>
            <div className="mx-xs h-4 w-px bg-border" />
            <Skeleton className="h-8 flex-1 max-w-60 rounded-radius-md" />
            <Skeleton className="h-8 w-20 rounded-radius-md" />
            <div className="ml-auto" />
            <Skeleton className="h-8 w-24 rounded-radius-md" />
            <Skeleton className="size-8 rounded-radius-md" />
          </>
        ) : (
          <>
            {/* Project identity */}
            <div className="flex items-center gap-sm">
              {project?.color && (
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: project.color }}
                  aria-hidden
                />
              )}
              <span className="text-body font-semibold text-foreground">{project?.name}</span>
            </div>

            <div className="mx-xs h-4 w-px shrink-0 bg-border" />

            {/* Search */}
            <div className="relative flex-1 max-w-[16rem] sm:max-w-[24rem]">
              <Search className="absolute left-sm top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                placeholder="Search tasks…"
                value={filters.search ?? ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, search: e.target.value || undefined })
                }
                className="h-8 w-full rounded-radius-md border border-border bg-surface-container-low pl-8 pr-sm text-body focus:outline-2 focus:outline-ring"
                aria-label="Search tasks"
              />
            </div>

            {/* Filter toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPanelOpen((v) => !v)}
              aria-expanded={panelOpen}
              aria-label="Toggle filters"
              className={cn('shrink-0', (panelOpen || active) && 'text-brand-primary')}
            >
              <Filter className="size-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {active && (
                <span className="ml-xs flex size-4 items-center justify-center rounded-full bg-brand-primary text-[9px] font-bold text-white">
                  !
                </span>
              )}
            </Button>

            {/* Clear */}
            {active && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltersChange({})}
                aria-label="Clear all filters"
                className="shrink-0"
              >
                <X className="size-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}

            <div className="ml-auto" />

            {/* View toggle */}
            <div className="flex rounded-radius-md border border-border bg-surface-container-low p-0.5">
              <button
                type="button"
                aria-pressed={activeView === 'board'}
                onClick={() => activeView !== 'board' && switchView('board')}
                className={cn(
                  'flex items-center gap-xs rounded-radius-sm px-sm py-xs text-body transition-colors',
                  activeView === 'board'
                    ? 'bg-surface-container-lowest text-foreground shadow-1'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <Kanban className="size-4" />
                <span className="hidden sm:inline">Board</span>
              </button>
              <button
                type="button"
                aria-pressed={activeView === 'list'}
                onClick={() => activeView !== 'list' && switchView('list')}
                className={cn(
                  'flex items-center gap-xs rounded-radius-sm px-sm py-xs text-body transition-colors',
                  activeView === 'list'
                    ? 'bg-surface-container-lowest text-foreground shadow-1'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <LayoutList className="size-4" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

            {/* Settings */}
            {canViewSettings ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateToSettings}
                aria-label="Project settings"
                className="shrink-0"
              >
                <Settings className="size-4" />
              </Button>
            ) : null}
          </>
        )}
      </div>

      {/* ── Expandable filter panel ─────────────────────────────────────────── */}
      {panelOpen && !isLoading && (
        <div className="border-b border-border bg-surface-container-lowest px-lg py-md">
          <div className="rounded-radius-lg border border-border bg-surface-container-lowest p-md">
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
              {/* Status */}
              {statuses.length > 0 && (
                <div className="flex flex-col gap-xs">
                  <span className="text-label font-semibold uppercase tracking-widest text-muted">
                    Status
                  </span>
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
              )}

              {/* Priority */}
              <div className="flex flex-col gap-xs">
                <span className="text-label font-semibold uppercase tracking-widest text-muted">
                  Priority
                </span>
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

              {/* Assignee */}
              {members.length > 0 && (
                <div className="flex flex-col gap-xs">
                  <span className="text-label font-semibold uppercase tracking-widest text-muted">
                    Assignee
                  </span>
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
              )}

              {/* Labels */}
              {labels.length > 0 && (
                <div className="flex flex-col gap-xs">
                  <span className="text-label font-semibold uppercase tracking-widest text-muted">
                    Labels
                  </span>
                  {labels.map((l) => (
                    <label key={l.id} className="flex cursor-pointer items-center gap-xs">
                      <input
                        type="checkbox"
                        checked={labelIds.includes(l.id)}
                        onChange={() => toggleLabel(l.id)}
                        className="rounded-radius-sm accent-brand-primary"
                      />
                      <span
                        className="inline-flex items-center gap-xs rounded px-sm py-0.5 text-label font-medium"
                        style={{ backgroundColor: `${l.color}22`, color: l.color }}
                      >
                        {l.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Due date range */}
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
        </div>
      )}
    </div>
  );
}
