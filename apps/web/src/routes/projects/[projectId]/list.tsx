import { useProject } from '@/api/projects';
import { ProjectToolbar } from '@/components/data/project-toolbar';
import { TaskDetailPanel } from '@/components/data/task-detail-panel';
import { TaskTable } from '@/components/data/task-table';
import { CreateTaskDialog } from '@/components/forms/create-task-dialog';
import { useShortcutProvider } from '@/components/shortcuts/shortcut-provider';
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

interface ProjectListPageProps {
  projectId: string;
}

export function ProjectListPage({ projectId }: ProjectListPageProps) {
  const { data: project, isLoading } = useProject(projectId);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);
  const canReadTasks = permissionSet.has(TASK_READ_PERMISSION);
  const canCreateTask = permissionSet.has(TASK_CREATE_PERMISSION);
  const canUpdateTask = permissionSet.has(TASK_UPDATE_PERMISSION);
  const search = useSearch({ from: '/_authenticated/projects/$projectId/list' });
  const { filters, setFilters } = useProjectFilters(
    '/_authenticated/projects/$projectId/list',
    projectId,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [panelTaskId, setPanelTaskId] = useState<string | null>(null);
  const { setScopeOverride } = useShortcutProvider();
  const hasHandledInitialSearch = useRef(false);

  useDocumentTitle(project?.name ? `${project.name} — List` : 'List');

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

  useEffect(() => {
    if (!canCreateTask) {
      return;
    }

    const handleCreateTaskShortcut = () => {
      setCreateOpen(true);
    };

    document.addEventListener('taskforge:shortcut:create-task', handleCreateTaskShortcut);
    return () => {
      document.removeEventListener('taskforge:shortcut:create-task', handleCreateTaskShortcut);
    };
  }, [canCreateTask]);

  useEffect(() => {
    setScopeOverride(panelTaskId ? 'task-detail' : null);
    return () => {
      setScopeOverride(null);
    };
  }, [panelTaskId, setScopeOverride]);

  function openTaskPanel(taskId: string) {
    setPanelTaskId(taskId);
    void navigate({
      to: '/projects/$projectId/list',
      params: { projectId },
      search: (prev) => ({ ...prev, task: taskId }),
    });
  }

  function closeTaskPanel() {
    setPanelTaskId(null);
    void navigate({
      to: '/projects/$projectId/list',
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ProjectToolbar
        project={project}
        isLoading={isLoading}
        projectId={projectId}
        activeView="list"
        filters={filters}
        onFiltersChange={setFilters}
        canViewSettings={canReadTasks}
      />

      {/* Task table */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-4 pt-2">
        <div className="p-lg">
          <TaskTable
            projectId={projectId}
            statuses={project?.statuses ?? []}
            members={project?.members ?? []}
            labels={project?.labels ?? []}
            onTaskClick={openTaskPanel}
            filters={filters}
            onFiltersChange={setFilters}
            canEditTask={canUpdateTask}
            canCreateTask={canCreateTask}
            onCreateTask={canCreateTask ? () => setCreateOpen(true) : undefined}
          />
        </div>
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
          onOpenChange={setCreateOpen}
          projectId={projectId}
          defaultStatusId={project.statuses?.[0]?.id}
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
