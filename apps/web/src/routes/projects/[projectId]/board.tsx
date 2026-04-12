import { useProject } from '@/api/projects';
import { ProjectToolbar } from '@/components/data/project-toolbar';
import { TaskDetailPanel } from '@/components/data/task-detail-panel';
import { CreateTaskDialog } from '@/components/forms/create-task-dialog';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useProjectFilters } from '@/hooks/use-project-filters';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  TASK_CREATE_PERMISSION,
  TASK_READ_PERMISSION,
  TASK_UPDATE_PERMISSION,
} from '@taskforge/shared';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface ProjectBoardPageProps {
  projectId: string;
}

export function ProjectBoardPage({ projectId }: ProjectBoardPageProps) {
  const { data: project, isLoading } = useProject(projectId);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);
  const canReadTasks = permissionSet.has(TASK_READ_PERMISSION);
  const canCreateTask = permissionSet.has(TASK_CREATE_PERMISSION);
  const canUpdateTask = permissionSet.has(TASK_UPDATE_PERMISSION);
  const search = useSearch({ from: '/_authenticated/projects/$projectId/board' });
  const { filters, setFilters } = useProjectFilters(
    '/_authenticated/projects/$projectId/board',
    projectId,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatusId, setCreateStatusId] = useState<string | undefined>();
  const [panelTaskId, setPanelTaskId] = useState<string | null>(null);
  const hasHandledInitialSearch = useRef(false);

  useDocumentTitle(project?.name ? `${project.name} — Board` : 'Board');

  useEffect(() => {
    if (canReadTasks) return;
    toast.error('You do not have access to this project task view.');
    void navigate({ to: '/projects', replace: true });
  }, [canReadTasks, navigate]);

  if (!canReadTasks) {
    return null;
  }

  useEffect(() => {
    if (!hasHandledInitialSearch.current) {
      hasHandledInitialSearch.current = true;
      if (search.task) {
        void navigate({
          to: '/projects/$projectId/tasks/$taskId',
          params: { projectId, taskId: search.task },
          replace: true,
        });
        return;
      }
    }

    setPanelTaskId(search.task ?? null);
  }, [navigate, projectId, search.task]);

  function openTaskPanel(taskId: string) {
    setPanelTaskId(taskId);
    void navigate({
      to: '/projects/$projectId/board',
      params: { projectId },
      search: (prev) => ({ ...prev, task: taskId }),
    });
  }

  function closeTaskPanel() {
    setPanelTaskId(null);
    void navigate({
      to: '/projects/$projectId/board',
      params: { projectId },
      search: (prev) => ({ ...prev, task: undefined }),
    });
  }

  function openTaskFullPage() {
    if (!panelTaskId) return;
    void navigate({
      to: '/projects/$projectId/tasks/$taskId',
      params: { projectId, taskId: panelTaskId },
    });
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      <ProjectToolbar
        project={project}
        isLoading={isLoading}
        projectId={projectId}
        activeView="board"
        filters={filters}
        onFiltersChange={setFilters}
        canViewSettings={canReadTasks}
      />

      {/* Board */}
      <div className="flex-1 overflow-x-auto py-md">
        <KanbanBoard
          projectId={projectId}
          statuses={project?.statuses ?? []}
          members={project?.members ?? []}
          allLabels={project?.labels ?? []}
          filters={filters}
          onTaskClick={openTaskPanel}
          onAddTask={(statusId) => {
            if (!canCreateTask) return;
            setCreateStatusId(statusId);
            setCreateOpen(true);
          }}
          onNavigateToSettings={() =>
            void navigate({ to: '/projects/$projectId/settings', params: { projectId } })
          }
          canCreateTask={canCreateTask}
          canUpdateTask={canUpdateTask}
        />
      </div>

      {canCreateTask ? (
        <>
          {/* Mobile FAB */}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="fixed bottom-20 right-lg z-20 flex size-14 items-center justify-center rounded-full bg-linear-to-br from-brand-primary to-accent text-white shadow-3 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
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
        </>
      ) : null}

      {project && canCreateTask && (
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

      {panelTaskId ? (
        <TaskDetailPanel
          projectId={projectId}
          taskId={panelTaskId}
          canEditTask={canUpdateTask}
          onClose={closeTaskPanel}
          onOpenFullPage={openTaskFullPage}
        />
      ) : null}
    </div>
  );
}
