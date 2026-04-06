import { useProject } from '@/api/projects';
import { ProjectToolbar } from '@/components/data/project-toolbar';
import { TaskDetailPanel } from '@/components/data/task-detail-panel';
import { TaskTable } from '@/components/data/task-table';
import { CreateTaskDialog } from '@/components/forms/create-task-dialog';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useProjectFilters } from '@/hooks/use-project-filters';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ProjectListPageProps {
  projectId: string;
}

export function ProjectListPage({ projectId }: ProjectListPageProps) {
  const { data: project, isLoading } = useProject(projectId);
  const navigate = useNavigate();
  const search = useSearch({ from: '/_authenticated/projects/$projectId/list' });
  const { filters, setFilters } = useProjectFilters(
    '/_authenticated/projects/$projectId/list',
    projectId,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [panelTaskId, setPanelTaskId] = useState<string | null>(null);
  const hasHandledInitialSearch = useRef(false);

  useDocumentTitle(project?.name ? `${project.name} — List` : 'List');

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
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      <ProjectToolbar
        project={project}
        isLoading={isLoading}
        projectId={projectId}
        activeView="list"
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Task table */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-lg">
          <TaskTable
            projectId={projectId}
            statuses={project?.statuses ?? []}
            members={project?.members ?? []}
            labels={project?.labels ?? []}
            onTaskClick={openTaskPanel}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      </div>

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

      {panelTaskId ? (
        <TaskDetailPanel
          projectId={projectId}
          taskId={panelTaskId}
          onClose={closeTaskPanel}
          onOpenFullPage={openTaskFullPage}
        />
      ) : null}
    </div>
  );
}
