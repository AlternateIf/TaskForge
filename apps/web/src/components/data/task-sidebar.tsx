import type { Attachment } from '@/api/attachments';
import type { Label, ProjectMember } from '@/api/projects';
import type { Priority, Task } from '@/api/tasks';
import { AttachmentList } from '@/components/data/attachment-list';
import {
  AssigneePicker,
  DueDatePicker,
  LabelPicker,
  PriorityPicker,
} from '@/components/data/task-inline-editors';
import { MetadataLabel } from '@/components/metadata-label';
import { PriorityBadge } from '@/components/priority-badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CalendarDays, Eye, EyeOff } from 'lucide-react';

interface TaskSidebarProps {
  task: Task;
  projectName?: string;
  createdByDisplay?: string;
  members: ProjectMember[];
  allLabels: Label[];
  attachments: Attachment[];
  uploadProgress: Array<{ filename: string; progress: number }>;
  watching: boolean;
  canEditTask?: boolean;
  onWatchToggle: () => void;
  onUploadFiles: (files: File[]) => void;
  onDeleteAttachment: (attachmentId: string) => void;
}

function dueDateLabel(dueDate?: string | null) {
  if (!dueDate) {
    return 'No due date';
  }

  return new Date(dueDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function resolveAssignee(
  task: Task,
  members: ProjectMember[],
): { id: string; displayName: string } | null {
  if (task.assignee?.id && task.assignee.displayName) {
    return { id: task.assignee.id, displayName: task.assignee.displayName };
  }
  if (!task.assigneeId) {
    return null;
  }
  const member = members.find((item) => item.userId === task.assigneeId);
  if (!member) {
    return null;
  }
  return { id: member.userId, displayName: member.displayName };
}

export function TaskSidebar({
  task,
  projectName,
  createdByDisplay,
  members,
  allLabels,
  attachments,
  uploadProgress,
  watching,
  canEditTask = true,
  onWatchToggle,
  onUploadFiles,
  onDeleteAttachment,
}: TaskSidebarProps) {
  const assignee = resolveAssignee(task, members);

  return (
    <aside className="space-y-md">
      <section className="space-y-md rounded-radius-lg border border-border/20 bg-surface-container-low/50 p-lg">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-md gap-y-xs">
          <MetadataLabel className="block whitespace-nowrap pt-1">Assignee</MetadataLabel>
          <div className="min-w-0 justify-self-end">
            {canEditTask ? (
              <AssigneePicker taskId={task.id} assigneeId={task.assigneeId} members={members}>
                {assignee ? (
                  <div className="inline-flex items-center gap-sm px-xs py-xs">
                    <Avatar name={assignee.displayName} userId={assignee.id} size="sm" />
                    <span className="text-small font-medium text-foreground">
                      {assignee.displayName}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-sm px-xs py-xs text-small text-muted">
                    Unassigned
                  </div>
                )}
              </AssigneePicker>
            ) : assignee ? (
              <div className="inline-flex items-center gap-sm px-xs py-xs">
                <Avatar name={assignee.displayName} userId={assignee.id} size="sm" />
                <span className="text-small font-medium text-foreground">
                  {assignee.displayName}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-sm px-xs py-xs text-small text-muted">
                Unassigned
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-md gap-y-xs">
          <MetadataLabel className="block whitespace-nowrap pt-1">Priority</MetadataLabel>
          <div className="min-w-0 justify-self-end">
            {canEditTask ? (
              <PriorityPicker taskId={task.id} priority={task.priority as Priority}>
                <div className="inline-flex rounded-radius-md px-sm py-xs">
                  <PriorityBadge
                    priority={task.priority as Priority}
                    showDot
                    showLabel
                    appearance="plain"
                  />
                </div>
              </PriorityPicker>
            ) : (
              <div className="inline-flex rounded-radius-md px-sm py-xs">
                <PriorityBadge
                  priority={task.priority as Priority}
                  showDot
                  showLabel
                  appearance="plain"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-md gap-y-xs">
          <MetadataLabel className="block whitespace-nowrap pt-1">Due date</MetadataLabel>
          <div className="min-w-0 justify-self-end">
            {canEditTask ? (
              <DueDatePicker taskId={task.id} dueDate={task.dueDate}>
                <div className="inline-flex items-center gap-xs px-xs py-xs text-small text-foreground">
                  <CalendarDays className="size-4 text-secondary" />
                  {dueDateLabel(task.dueDate)}
                </div>
              </DueDatePicker>
            ) : (
              <div className="inline-flex items-center gap-xs px-xs py-xs text-small text-foreground">
                <CalendarDays className="size-4 text-secondary" />
                {dueDateLabel(task.dueDate)}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-md gap-y-xs">
          <MetadataLabel className="block whitespace-nowrap pt-1">Project</MetadataLabel>
          <p className="min-w-0 justify-self-end text-right text-small font-semibold text-brand-primary">
            {projectName ?? 'Project'}
          </p>
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-md gap-y-xs">
          <MetadataLabel className="block whitespace-nowrap pt-1">Labels</MetadataLabel>
          <div className="min-w-0 justify-self-end">
            {canEditTask ? (
              <LabelPicker
                taskId={task.id}
                selectedLabels={task.labels ?? []}
                allLabels={allLabels}
              >
                <div className="flex flex-wrap justify-end gap-xs">
                  {(task.labels ?? []).length === 0 ? (
                    <span className="text-small text-muted">No labels</span>
                  ) : (
                    (task.labels ?? []).map((label) => (
                      <span
                        key={label.id}
                        className="rounded-full px-sm py-0.5 text-label font-semibold"
                        style={{
                          backgroundColor: label.color ? `${label.color}22` : undefined,
                          color: label.color ?? undefined,
                        }}
                      >
                        {label.name}
                      </span>
                    ))
                  )}
                </div>
              </LabelPicker>
            ) : (
              <div className="flex flex-wrap justify-end gap-xs">
                {(task.labels ?? []).length === 0 ? (
                  <span className="text-small text-muted">No labels</span>
                ) : (
                  (task.labels ?? []).map((label) => (
                    <span
                      key={label.id}
                      className="rounded-full px-sm py-0.5 text-label font-semibold"
                      style={{
                        backgroundColor: label.color ? `${label.color}22` : undefined,
                        color: label.color ?? undefined,
                      }}
                    >
                      {label.name}
                    </span>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-md gap-y-xs">
          <MetadataLabel className="block whitespace-nowrap pt-1">Created by</MetadataLabel>
          <p className="min-w-0 justify-self-end whitespace-pre-wrap text-right text-small text-secondary">
            {createdByDisplay ?? task.reporterId}
          </p>
        </div>

        <div className="pt-xs">
          <Button variant="secondary" size="sm" onClick={onWatchToggle} className="w-full">
            {watching ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {watching ? 'Unwatch task' : 'Watch task'}
          </Button>
        </div>
      </section>

      <AttachmentList
        attachments={attachments}
        uploadProgress={uploadProgress}
        onUploadFiles={onUploadFiles}
        onDeleteAttachment={onDeleteAttachment}
        canUpload={canEditTask}
        canDelete={canEditTask}
      />
    </aside>
  );
}
