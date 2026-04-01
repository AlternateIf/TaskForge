import type { Label, ProjectMember } from '@/api/projects';
import type { Task } from '@/api/tasks';
import {
  AssigneePicker,
  DueDatePicker,
  LabelPicker,
  PriorityPicker,
} from '@/components/data/task-inline-editors';
import { PriorityBadge } from '@/components/priority-badge';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays } from 'lucide-react';

interface KanbanCardProps {
  task: Task;
  members: ProjectMember[];
  allLabels: Label[];
  onClick: () => void;
  isDragging?: boolean;
}

function formatDueDate(iso: string): { label: string; overdue: boolean } {
  const date = new Date(iso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return {
    label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    overdue: date < now,
  };
}

function CardContent({
  task,
  members,
  allLabels,
  onTitleClick,
}: {
  task: Task;
  members: ProjectMember[];
  allLabels: Label[];
  onTitleClick: () => void;
}) {
  const labels = task.labels ?? [];
  const visibleLabels = labels.slice(0, 3);
  const extraLabels = labels.length - visibleLabels.length;

  return (
    <>
      {/* Top row: labels (left) + priority dot (right) */}
      <div className="mb-sm flex items-center justify-between gap-xs">
        <LabelPicker taskId={task.id} selectedLabels={labels} allLabels={allLabels}>
          <div className="flex flex-wrap gap-xs">
            {visibleLabels.map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center rounded px-xs py-0.5 text-label font-medium"
                style={{ backgroundColor: `${l.color}22`, color: l.color ?? undefined }}
              >
                {l.name}
              </span>
            ))}
            {extraLabels > 0 && (
              <span className="inline-flex items-center rounded-full px-xs py-0.5 text-label text-muted">
                +{extraLabels}
              </span>
            )}
            {labels.length === 0 && (
              <span
                className="invisible inline-flex items-center rounded px-xs py-0.5 text-label font-medium"
                aria-hidden
              >
                &nbsp;
              </span>
            )}
          </div>
        </LabelPicker>
        <PriorityPicker taskId={task.id} priority={task.priority}>
          <PriorityBadge priority={task.priority} showLabel={false} showDot className="shrink-0" />
        </PriorityPicker>
      </div>

      {/* Title — navigates to task page */}
      <button
        type="button"
        className="mb-md w-full text-left"
        onClick={(e) => {
          e.stopPropagation();
          onTitleClick();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p className="line-clamp-2 text-body font-medium text-foreground hover:text-brand-primary">
          {task.title}
        </p>
      </button>

      {/* Footer: due date + assignee */}
      <div className="flex items-center justify-between gap-xs">
        <DueDatePicker taskId={task.id} dueDate={task.dueDate}>
          {task.dueDate ? (
            (() => {
              const { label, overdue } = formatDueDate(task.dueDate);
              return (
                <span
                  className={cn(
                    'inline-flex items-center gap-xs rounded px-xs py-0.5 text-label font-medium',
                    overdue
                      ? 'bg-danger/10 text-danger'
                      : 'bg-surface-container-high text-secondary',
                  )}
                >
                  <CalendarDays className="size-3" />
                  {label}
                </span>
              );
            })()
          ) : (
            <span className="inline-flex items-center gap-xs rounded px-xs py-0.5 text-label bg-surface-container-high text-muted">
              <CalendarDays className="size-3" />–
            </span>
          )}
        </DueDatePicker>
        <AssigneePicker taskId={task.id} assigneeId={task.assigneeId} members={members}>
          {task.assignee ? (
            <Avatar
              name={task.assignee.displayName}
              userId={task.assignee.id}
              size="sm"
              className="shrink-0"
            />
          ) : (
            <div className="size-6 shrink-0 rounded-full border-2 border-dashed border-border" />
          )}
        </AssigneePicker>
      </div>
    </>
  );
}

export function KanbanCard({
  task,
  members,
  allLabels,
  onClick,
  isDragging = false,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id, data: { type: 'card', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-pointer select-none rounded-radius-md border border-border bg-surface-container-lowest p-sm shadow-2 transition-shadow hover:shadow-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        (isDragging || isSortableDragging) &&
          'cursor-grabbing opacity-50 shadow-3 ring-2 ring-brand-primary',
      )}
    >
      <CardContent task={task} members={members} allLabels={allLabels} onTitleClick={onClick} />
    </div>
  );
}

/** Overlay card shown during active drag — same layout but not interactive */
export function KanbanCardOverlay({ task }: { task: Task }) {
  return (
    <div className="cursor-grabbing rounded-radius-md border border-border bg-surface-container-lowest p-sm shadow-3 ring-2 ring-brand-primary">
      <CardContent task={task} members={[]} allLabels={[]} onTitleClick={() => {}} />
    </div>
  );
}
