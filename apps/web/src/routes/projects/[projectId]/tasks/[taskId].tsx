import { useProject } from '@/api/projects';
import { useTask } from '@/api/tasks';
import { TaskDetailContent } from '@/components/data/task-detail-content';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useNavigate } from '@tanstack/react-router';
import { ChevronRight, House, LayoutGrid, Settings2 } from 'lucide-react';

interface ProjectTaskDetailPageProps {
  projectId: string;
  taskId: string;
}

export function ProjectTaskDetailPage({ projectId, taskId }: ProjectTaskDetailPageProps) {
  const navigate = useNavigate();
  const { data: project } = useProject(projectId);
  const { data: task } = useTask(taskId);

  useDocumentTitle(task?.title ? `${task.title} — Task` : 'Task details');

  return (
    <div className="space-y-md pb-24 md:pb-0">
      <nav className="flex items-center gap-xs text-small text-secondary" aria-label="Breadcrumb">
        <button
          type="button"
          className="inline-flex items-center gap-xs hover:text-brand-primary"
          onClick={() => void navigate({ to: '/projects' })}
        >
          <House className="size-4" />
          Projects
        </button>
        <ChevronRight className="size-3.5" />
        <button
          type="button"
          className="hover:text-brand-primary"
          onClick={() =>
            void navigate({
              to: '/projects/$projectId/board',
              params: { projectId },
              search: { task: undefined },
            })
          }
        >
          {project?.name ?? projectId.slice(0, 8)}
        </button>
        <ChevronRight className="size-3.5" />
        <span className="font-semibold text-foreground">
          {task?.id.slice(0, 8) ?? taskId.slice(0, 8)}
        </span>
      </nav>

      <TaskDetailContent projectId={projectId} taskId={taskId} variant="page" />

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-border/20 bg-surface-container-lowest/95 p-sm md:hidden">
        <button
          type="button"
          className="inline-flex flex-col items-center gap-[2px] text-label text-secondary"
          onClick={() =>
            void navigate({
              to: '/projects/$projectId/board',
              params: { projectId },
              search: { task: undefined },
            })
          }
        >
          <LayoutGrid className="size-4" />
          Board
        </button>
        <button
          type="button"
          className="inline-flex flex-col items-center gap-[2px] text-label text-brand-primary"
          aria-current="page"
        >
          <House className="size-4" />
          Task
        </button>
        <button
          type="button"
          className="inline-flex flex-col items-center gap-[2px] text-label text-secondary"
          onClick={() =>
            void navigate({ to: '/projects/$projectId/settings', params: { projectId } })
          }
        >
          <Settings2 className="size-4" />
          Settings
        </button>
      </nav>
    </div>
  );
}
