import { TaskDetailContent } from '@/components/data/task-detail-content';
import { useEffect } from 'react';

interface TaskDetailPanelProps {
  projectId: string;
  taskId: string;
  onClose: () => void;
  onOpenFullPage: () => void;
  canEditTask?: boolean;
}

export function TaskDetailPanel({
  projectId,
  taskId,
  onClose,
  onOpenFullPage,
  canEditTask = true,
}: TaskDetailPanelProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px]"
        aria-label="Close task details"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 z-50 h-screen w-full overflow-hidden bg-surface-container-lowest shadow-4 md:w-[640px]">
        <TaskDetailContent
          projectId={projectId}
          taskId={taskId}
          variant="panel"
          canEditTask={canEditTask}
          onClose={onClose}
          onOpenFullPage={onOpenFullPage}
        />
      </aside>
    </div>
  );
}
