import type { Label, ProjectMember, WorkflowStatus } from '@/api/projects';
import type { Task } from '@/api/tasks';
import {
  AssigneePicker,
  DueDatePicker,
  LabelPicker,
  PriorityPicker,
  StatusPicker,
} from '@/components/data/task-inline-editors';
import { PriorityBadge } from '@/components/priority-badge';
import { Avatar } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';

interface TaskRowProps {
  task: Task;
  statuses: WorkflowStatus[];
  members: ProjectMember[];
  allLabels: Label[];
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
  canEditTask?: boolean;
}

function formatDueDate(iso: string): { label: string; overdue: boolean } {
  const date = new Date(iso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const overdue = date < now;
  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { label, overdue };
}

export function TaskRow({
  task,
  statuses,
  members,
  allLabels,
  selected,
  onSelect,
  onClick,
  canEditTask = true,
}: TaskRowProps) {
  const status = statuses.find((s) => s.id === task.statusId);
  const taskLabels = task.labels ?? [];
  const visibleLabels = taskLabels.slice(0, 3);
  const extraLabels = taskLabels.length - visibleLabels.length;

  return (
    <tr
      className={cn(
        'group border-b border-border transition-colors hover:bg-surface-container-low',
        selected && 'bg-brand-primary/5',
      )}
    >
      {/* Checkbox */}
      <td className="w-10 px-md py-sm">
        <Checkbox
          checked={selected}
          disabled={!canEditTask}
          onChange={(e) => onSelect(e.target.checked)}
          aria-label={`Select task "${task.title}"`}
        />
      </td>

      {/* Title — only this navigates */}
      <td className="min-w-0 px-sm py-sm">
        <button type="button" className="w-full text-left" onClick={onClick}>
          <span className="line-clamp-1 text-body font-medium text-foreground hover:text-brand-primary">
            {task.title}
          </span>
        </button>
      </td>

      {/* Status */}
      <td className="hidden px-sm py-sm sm:table-cell">
        {status &&
          (canEditTask ? (
            <StatusPicker taskId={task.id} statusId={task.statusId} statuses={statuses}>
              <span
                className="inline-flex items-center gap-xs rounded px-sm py-0.5 text-label font-medium"
                style={{ backgroundColor: `${status.color}22`, color: status.color }}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: status.color }}
                  aria-hidden
                />
                {status.name}
              </span>
            </StatusPicker>
          ) : (
            <span
              className="inline-flex items-center gap-xs rounded px-sm py-0.5 text-label font-medium"
              style={{ backgroundColor: `${status.color}22`, color: status.color }}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: status.color }}
                aria-hidden
              />
              {status.name}
            </span>
          ))}
      </td>

      {/* Priority */}
      <td className="hidden px-sm py-sm md:table-cell">
        {canEditTask ? (
          <PriorityPicker taskId={task.id} priority={task.priority}>
            <PriorityBadge priority={task.priority} showDot showLabel />
          </PriorityPicker>
        ) : (
          <PriorityBadge priority={task.priority} showDot showLabel />
        )}
      </td>

      {/* Assignee */}
      <td className="hidden px-sm py-sm lg:table-cell">
        {canEditTask ? (
          <AssigneePicker taskId={task.id} assigneeId={task.assigneeId} members={members}>
            {task.assignee ? (
              <div className="flex items-center gap-xs">
                <Avatar name={task.assignee.displayName} userId={task.assignee.id} size="sm" />
                <span className="text-body text-secondary">{task.assignee.displayName}</span>
              </div>
            ) : (
              <div className="size-6 rounded-full border-2 border-dashed border-border" />
            )}
          </AssigneePicker>
        ) : task.assignee ? (
          <div className="flex items-center gap-xs">
            <Avatar name={task.assignee.displayName} userId={task.assignee.id} size="sm" />
            <span className="text-body text-secondary">{task.assignee.displayName}</span>
          </div>
        ) : (
          <div className="size-6 rounded-full border-2 border-dashed border-border" />
        )}
      </td>

      {/* Due date */}
      <td className="hidden px-sm py-sm xl:table-cell">
        {canEditTask ? (
          <DueDatePicker taskId={task.id} dueDate={task.dueDate}>
            {task.dueDate ? (
              (() => {
                const { label, overdue } = formatDueDate(task.dueDate);
                return (
                  <span
                    className={cn(
                      'inline-flex items-center gap-xs rounded px-sm py-0.5 text-label font-medium',
                      overdue
                        ? 'bg-danger/10 text-danger'
                        : 'bg-surface-container-high text-secondary',
                    )}
                  >
                    <CalendarDays className="size-3.5" />
                    {label}
                  </span>
                );
              })()
            ) : (
              <span className="inline-flex items-center gap-xs rounded px-sm py-0.5 text-label bg-surface-container-high text-muted">
                <CalendarDays className="size-3.5" />–
              </span>
            )}
          </DueDatePicker>
        ) : task.dueDate ? (
          (() => {
            const { label, overdue } = formatDueDate(task.dueDate);
            return (
              <span
                className={cn(
                  'inline-flex items-center gap-xs rounded px-sm py-0.5 text-label font-medium',
                  overdue ? 'bg-danger/10 text-danger' : 'bg-surface-container-high text-secondary',
                )}
              >
                <CalendarDays className="size-3.5" />
                {label}
              </span>
            );
          })()
        ) : (
          <span className="inline-flex items-center gap-xs rounded px-sm py-0.5 text-label bg-surface-container-high text-muted">
            <CalendarDays className="size-3.5" />–
          </span>
        )}
      </td>

      {/* Labels */}
      <td className="hidden px-sm py-sm xl:table-cell">
        {canEditTask ? (
          <LabelPicker taskId={task.id} selectedLabels={taskLabels} allLabels={allLabels}>
            <div className="flex flex-wrap gap-xs">
              {visibleLabels.map((l) => (
                <span
                  key={l.id}
                  className="inline-flex items-center rounded px-sm py-0.5 text-label font-medium"
                  style={{ backgroundColor: `${l.color}22`, color: l.color ?? undefined }}
                >
                  {l.name}
                </span>
              ))}
              {extraLabels > 0 && (
                <span className="inline-flex items-center rounded px-sm py-0.5 text-label font-medium text-muted">
                  +{extraLabels}
                </span>
              )}
              {taskLabels.length === 0 && (
                <span className="inline-flex items-center rounded px-sm py-0.5 text-label text-muted">
                  Add label
                </span>
              )}
            </div>
          </LabelPicker>
        ) : (
          <div className="flex flex-wrap gap-xs">
            {visibleLabels.map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center rounded px-sm py-0.5 text-label font-medium"
                style={{ backgroundColor: `${l.color}22`, color: l.color ?? undefined }}
              >
                {l.name}
              </span>
            ))}
            {extraLabels > 0 && (
              <span className="inline-flex items-center rounded px-sm py-0.5 text-label font-medium text-muted">
                +{extraLabels}
              </span>
            )}
            {taskLabels.length === 0 && (
              <span className="inline-flex items-center rounded px-sm py-0.5 text-label text-muted">
                No labels
              </span>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
