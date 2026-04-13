import type { Label, ProjectMember, WorkflowStatus } from '@/api/projects';
import type { Task } from '@/api/tasks';
import { GlassPanel } from '@/components/glass-panel';
import { KanbanCard } from '@/components/kanban/kanban-card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  status: WorkflowStatus;
  tasks: Task[];
  members: ProjectMember[];
  allLabels: Label[];
  onTaskClick: (taskId: string) => void;
  onAddTask: (statusId: string) => void;
  isLoading?: boolean;
  canCreateTask?: boolean;
  canEditTask?: boolean;
}

export function KanbanColumn({
  status,
  tasks,
  members,
  allLabels,
  onTaskClick,
  onAddTask,
  isLoading,
  canCreateTask = true,
  canEditTask = true,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status.id}`,
    data: { type: 'column', statusId: status.id },
  });

  const taskIds = tasks.map((t) => t.id);

  return (
    <GlassPanel
      ref={setNodeRef}
      className={cn(
        'flex h-full max-h-full w-72 shrink-0 snap-start flex-col rounded-radius-lg border border-border transition-colors',
        isOver && 'border-brand-primary bg-brand-primary/5',
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-md py-sm">
        <div className="flex items-center gap-sm">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: status.color }}
            aria-hidden
          />
          <h3 className="text-body font-semibold text-foreground">{status.name}</h3>
        </div>
        <span
          className="flex size-5 items-center justify-center rounded-full bg-surface-container text-label font-semibold text-secondary"
          aria-label={`${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      <div
        className="flex min-h-0 flex-1 flex-col gap-sm overflow-y-auto px-sm pb-sm"
        style={{ minHeight: 64 }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {isLoading ? (
            <>
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-radius-md bg-surface-container-lowest p-sm">
                  <div className="mb-xs flex items-start gap-xs">
                    <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-full rounded" />
                  </div>
                  <Skeleton className="mb-xs h-3 w-2/3 rounded" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="size-6 rounded-full" />
                  </div>
                </div>
              ))}
            </>
          ) : tasks.length === 0 ? (
            <div className="flex min-h-16 flex-col items-center justify-center rounded-radius-md border border-dashed border-border py-lg text-center">
              <p className="text-label text-muted">No tasks</p>
            </div>
          ) : (
            tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                members={members}
                allLabels={allLabels}
                onClick={() => onTaskClick(task.id)}
                canEditTask={canEditTask}
              />
            ))
          )}
        </SortableContext>
      </div>

      {canCreateTask ? (
        <div className="border-t border-border px-sm py-sm">
          <button
            type="button"
            onClick={() => onAddTask(status.id)}
            className="flex w-full items-center gap-xs rounded-radius-md px-sm py-xs text-body text-muted transition-colors hover:bg-surface-container hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus className="size-4" />
            Add task
          </button>
        </div>
      ) : null}
    </GlassPanel>
  );
}
