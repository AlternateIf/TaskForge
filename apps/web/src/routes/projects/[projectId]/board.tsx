import { useProject } from '@/api/projects';
import type { TaskFilters } from '@/api/tasks';
import { TaskFiltersBar } from '@/components/data/task-filters';
import { CreateTaskDialog } from '@/components/forms/create-task-dialog';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { Kanban, LayoutList, Plus, Settings } from 'lucide-react';
import { useState } from 'react';

interface ProjectBoardPageProps {
  projectId: string;
}

export function ProjectBoardPage({ projectId }: ProjectBoardPageProps) {
  const { data: project, isLoading } = useProject(projectId);
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TaskFilters>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatusId, setCreateStatusId] = useState<string | undefined>();

  useDocumentTitle(project?.name ? `${project.name} — Board` : 'Board');

  function switchToList() {
    localStorage.setItem(`tf:project:${projectId}:view`, 'list');
    void navigate({ to: '/projects/$projectId/list', params: { projectId } });
  }

  function navigateToSettings() {
    void navigate({ to: '/projects/$projectId/settings', params: { projectId } });
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Project header */}
      <div className="flex shrink-0 flex-wrap items-center gap-sm border-b border-border bg-surface-container-lowest px-lg py-sm">
        {isLoading ? (
          <>
            <div className="flex items-center gap-sm">
              <Skeleton className="size-3 rounded-full" />
              <Skeleton className="h-6 w-40 rounded" />
            </div>
            <div className="ml-auto flex items-center gap-sm">
              <Skeleton className="h-8 w-24 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-sm">
              {project?.color && (
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                  aria-hidden
                />
              )}
              <h1 className="text-heading-2 font-bold text-foreground">{project?.name}</h1>
            </div>
            <div className="ml-auto flex items-center gap-sm">
              {/* View toggle */}
              <div className="flex rounded-radius-md border border-border bg-surface-container-low p-0.5">
                <button
                  type="button"
                  aria-pressed={true}
                  className={cn(
                    'flex items-center gap-xs rounded-radius-sm px-sm py-xs text-body transition-colors',
                    'bg-surface-container-lowest text-foreground shadow-1',
                  )}
                >
                  <Kanban className="size-4" />
                  <span className="hidden sm:inline">Board</span>
                </button>
                <button
                  type="button"
                  aria-pressed={false}
                  onClick={switchToList}
                  className="flex items-center gap-xs rounded-radius-sm px-sm py-xs text-body text-muted transition-colors hover:text-foreground"
                >
                  <LayoutList className="size-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateToSettings}
                aria-label="Project settings"
              >
                <Settings className="size-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Filter bar */}
      <div className="shrink-0 border-b border-border bg-surface-container-lowest px-lg py-sm">
        <TaskFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          statuses={project?.statuses ?? []}
          members={project?.members ?? []}
          labels={project?.labels ?? []}
        />
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto px-lg py-md">
        <KanbanBoard
          projectId={projectId}
          statuses={project?.statuses ?? []}
          members={project?.members ?? []}
          allLabels={project?.labels ?? []}
          filters={filters}
          onTaskClick={(taskId) =>
            // MVP-024: task detail route added in next feature
            void navigate({ to: `/tasks/${taskId}` as '/dashboard' })
          }
          onAddTask={(statusId) => {
            setCreateStatusId(statusId);
            setCreateOpen(true);
          }}
          onNavigateToSettings={navigateToSettings}
        />
      </div>

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-20 right-lg z-20 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-accent text-white shadow-3 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
        aria-label="Create new task"
      >
        <Plus className="size-6" />
      </button>

      {/* Desktop create button */}
      <div className="fixed bottom-lg right-lg hidden md:block">
        <Button variant="primary" onClick={() => setCreateOpen(true)} className="shadow-3">
          <Plus className="size-4" />
          New Task
        </Button>
      </div>

      {project && (
        <CreateTaskDialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) setCreateStatusId(undefined);
          }}
          projectId={projectId}
          defaultStatusId={createStatusId ?? project.statuses?.[0]?.id}
          statuses={project.statuses ?? []}
          members={project.members ?? []}
          labels={project.labels ?? []}
        />
      )}
    </div>
  );
}
