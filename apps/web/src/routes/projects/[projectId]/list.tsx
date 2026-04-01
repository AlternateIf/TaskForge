import { useProject } from '@/api/projects';
import { TaskTable } from '@/components/data/task-table';
import { CreateTaskDialog } from '@/components/forms/create-task-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { Kanban, LayoutList, Plus, Settings } from 'lucide-react';
import { useState } from 'react';

interface ProjectListPageProps {
  projectId: string;
}

export function ProjectListPage({ projectId }: ProjectListPageProps) {
  const { data: project, isLoading } = useProject(projectId);
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  useDocumentTitle(project?.name ? `${project.name} — List` : 'List');

  function switchToBoard() {
    localStorage.setItem(`tf:project:${projectId}:view`, 'board');
    void navigate({ to: '/projects/$projectId/board', params: { projectId } });
  }

  function navigateToSettings() {
    void navigate({ to: '/projects/$projectId/settings', params: { projectId } });
  }

  return (
    <div className="mx-auto max-w-screen-xl p-lg">
      {/* Project header */}
      <div className="mb-lg flex flex-wrap items-center gap-sm">
        {isLoading ? (
          <>
            <div className="flex items-center gap-sm">
              <Skeleton className="size-3 rounded-full" />
              <Skeleton className="h-7 w-40 rounded" />
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
              <h1 className="text-heading-1 font-bold text-foreground">{project?.name}</h1>
            </div>
            <div className="ml-auto flex items-center gap-sm">
              {/* View toggle */}
              <div className="flex rounded-radius-md border border-border bg-surface-container-low p-0.5">
                <button
                  type="button"
                  aria-pressed={false}
                  onClick={switchToBoard}
                  className="flex items-center gap-xs rounded-radius-sm px-sm py-xs text-body text-muted transition-colors hover:text-foreground"
                >
                  <Kanban className="size-4" />
                  <span className="hidden sm:inline">Board</span>
                </button>
                <button
                  type="button"
                  aria-pressed={true}
                  className={cn(
                    'flex items-center gap-xs rounded-radius-sm px-sm py-xs text-body transition-colors',
                    'bg-surface-container-lowest text-foreground shadow-1',
                  )}
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
              <Button
                variant="primary"
                size="sm"
                className="text-white"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">New Task</span>
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Task table with built-in filters, sorting, bulk actions */}
      <TaskTable
        projectId={projectId}
        statuses={project?.statuses ?? []}
        members={project?.members ?? []}
        labels={project?.labels ?? []}
        onTaskClick={(taskId) =>
          // MVP-024: task detail route added in next feature
          void navigate({ to: `/tasks/${taskId}` as '/dashboard' })
        }
      />

      {project && (
        <CreateTaskDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          projectId={projectId}
          defaultStatusId={project.statuses?.[0]?.id}
          statuses={project.statuses ?? []}
          members={project.members ?? []}
          labels={project.labels ?? []}
        />
      )}
    </div>
  );
}
