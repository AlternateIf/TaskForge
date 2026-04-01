import type { DependencyList as DependencyListData } from '@/api/dependencies';
import { useTask } from '@/api/tasks';
import { Button } from '@/components/ui/button';
import { ChevronRight, Plus } from 'lucide-react';

interface DependencyListProps {
  projectId: string;
  dependencies?: DependencyListData;
  onAddDependency?: () => void;
}

function formatDependencyLabel(taskId: string) {
  return `TASK-${taskId.slice(0, 8).toUpperCase()}`;
}

function DependencyTaskLink({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { data: task } = useTask(taskId);
  const fallbackTitle = formatDependencyLabel(taskId);
  const fullTitle = task?.title ?? fallbackTitle;

  return (
    <a
      href={`/projects/${projectId}/tasks/${taskId}`}
      title={fullTitle}
      className="inline-flex max-w-full items-center text-small font-medium text-brand-primary underline decoration-transparent underline-offset-2 transition-colors hover:decoration-brand-primary focus-visible:decoration-brand-primary"
      aria-label={`Open ${fullTitle}`}
    >
      <span className="truncate">{formatDependencyLabel(taskId)}</span>
    </a>
  );
}

export function DependencyList({ projectId, dependencies, onAddDependency }: DependencyListProps) {
  const blockedBy = dependencies?.blockedBy ?? [];
  const blocking = dependencies?.blocking ?? [];

  return (
    <details
      className="group rounded-radius-lg border border-border/20 bg-surface-container-low/40 p-md"
      open
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-sm [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-xs text-label font-bold uppercase tracking-widest text-secondary">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
          Dependencies
        </span>
        {onAddDependency ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAddDependency();
            }}
          >
            <Plus className="size-4" />
            Add
          </Button>
        ) : null}
      </summary>

      <div className="mt-md grid gap-md md:grid-cols-2">
        <article className="rounded-radius-lg border border-border/20 bg-surface-container-low/50 p-md">
          <h4 className="text-small font-semibold text-foreground">
            Blocked by ({blockedBy.length})
          </h4>
          <ul className="mt-sm space-y-xs">
            {blockedBy.length === 0 ? (
              <li className="text-small text-muted">No blockers.</li>
            ) : (
              blockedBy.map((item) => (
                <li key={item.id} className="text-small text-secondary">
                  <DependencyTaskLink projectId={projectId} taskId={item.dependsOnTaskId} />
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="rounded-radius-lg border border-border/20 bg-surface-container-low/50 p-md">
          <h4 className="text-small font-semibold text-foreground">Blocks ({blocking.length})</h4>
          <ul className="mt-sm space-y-xs">
            {blocking.length === 0 ? (
              <li className="text-small text-muted">Not blocking other tasks.</li>
            ) : (
              blocking.map((item) => (
                <li key={item.id} className="text-small text-secondary">
                  <DependencyTaskLink projectId={projectId} taskId={item.taskId} />
                </li>
              ))
            )}
          </ul>
        </article>
      </div>
    </details>
  );
}
