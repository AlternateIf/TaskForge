import type { Task } from '@/api/tasks';
import { calculateSubtaskProgress } from '@/components/data/task-detail-utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, Plus } from 'lucide-react';

interface SubtaskListProps {
  projectId: string;
  subtasks: Task[];
  subtaskCount: number;
  subtaskCompletedCount: number;
  finalStatusIds?: string[];
  onCreateSubtask?: () => void;
}

export function SubtaskList({
  projectId,
  subtasks,
  subtaskCount,
  subtaskCompletedCount,
  finalStatusIds = [],
  onCreateSubtask,
}: SubtaskListProps) {
  const progress = calculateSubtaskProgress(subtaskCount, subtaskCompletedCount);
  const finalStatusIdSet = new Set(finalStatusIds);

  return (
    <details
      className="group rounded-radius-lg border border-border/20 bg-surface-container-low/40 p-md"
      open
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-sm [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-xs text-label font-bold uppercase tracking-widest text-secondary">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
          Subtasks
        </span>
        {onCreateSubtask ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onCreateSubtask();
            }}
          >
            <Plus className="size-4" />
            Add
          </Button>
        ) : null}
      </summary>

      <div className="mt-md space-y-sm">
        <div className="h-2 overflow-hidden rounded-full bg-surface-container-low">
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-accent transition-all"
            style={{ width: `${progress}%` }}
            aria-hidden
          />
        </div>

        <p className="text-small text-secondary">
          {subtaskCompletedCount}/{subtaskCount || subtasks.length} completed
        </p>

        <ul className="space-y-xs">
          {subtasks.length === 0 ? (
            <li className="rounded-radius-md border border-dashed border-border p-sm text-small text-muted">
              No subtasks yet.
            </li>
          ) : (
            subtasks.map((subtask) => (
              <li
                key={subtask.id}
                className="flex items-center gap-sm rounded-radius-md p-xs hover:bg-surface-container-low"
              >
                <Checkbox
                  checked={finalStatusIdSet.has(subtask.statusId)}
                  readOnly
                  aria-label={`Subtask ${subtask.title}`}
                />
                <a
                  href={`/projects/${projectId}/tasks/${subtask.id}`}
                  title={subtask.title}
                  className="line-clamp-1 text-body font-medium text-brand-primary underline decoration-transparent underline-offset-2 transition-colors hover:decoration-brand-primary focus-visible:decoration-brand-primary"
                >
                  {subtask.title}
                </a>
              </li>
            ))
          )}
        </ul>
      </div>
    </details>
  );
}
