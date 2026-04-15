import { useTaskActivity } from '@/api/activity';
import { useAttachments, useDeleteAttachment, useUploadFile } from '@/api/attachments';
import { useChecklists, useToggleItem } from '@/api/checklists';
import { useComments, useCreateComment } from '@/api/comments';
import { useDependencies } from '@/api/dependencies';
import { useOrgMembers } from '@/api/organizations';
import { useProject } from '@/api/projects';
import {
  type Task,
  useSubtasks,
  useTask,
  useUnwatchTask,
  useUpdateTask,
  useWatchTask,
} from '@/api/tasks';
import { ActivityFeed } from '@/components/data/activity-feed';
import { ChecklistSection } from '@/components/data/checklist-section';
import { CommentInput } from '@/components/data/comment-input';
import { CommentThread } from '@/components/data/comment-thread';
import { DependencyList } from '@/components/data/dependency-list';
import { SubtaskList } from '@/components/data/subtask-list';
import { TaskDescription } from '@/components/data/task-description';
import {
  buildTimelineEntries,
  toggleChecklistItemOptimistic,
} from '@/components/data/task-detail-utils';
import { TaskHeader } from '@/components/data/task-header';
import {
  AssigneePicker,
  DueDatePicker,
  LabelPicker,
  PriorityPicker,
} from '@/components/data/task-inline-editors';
import { TaskSidebar } from '@/components/data/task-sidebar';
import type { MentionUser } from '@/components/editor';
import { AddDependencyDialog } from '@/components/forms/add-dependency-dialog';
import { CreateTaskDialog } from '@/components/forms/create-task-dialog';
import { useRegisterShortcut } from '@/components/shortcuts/shortcut-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { TASK_UPDATE_PERMISSION } from '@taskforge/shared';
import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const MEMBERS_READ_PERMISSION = 'membership.read.org';

interface TaskDetailContentProps {
  projectId: string;
  taskId: string;
  variant: 'panel' | 'page';
  canEditTask?: boolean;
  onClose?: () => void;
  onOpenFullPage?: () => void;
}

interface UploadProgressItem {
  filename: string;
  progress: number;
}

function updateUploadProgress(
  current: UploadProgressItem[],
  filename: string,
  progress: number,
): UploadProgressItem[] {
  const exists = current.some((item) => item.filename === filename);
  if (!exists) {
    return [...current, { filename, progress }];
  }

  return current.map((item) => (item.filename === filename ? { ...item, progress } : item));
}

function removeUploadProgress(
  current: UploadProgressItem[],
  filename: string,
): UploadProgressItem[] {
  return current.filter((item) => item.filename !== filename);
}

function resolveCreatedByDisplay(task: Task, memberUsers: MentionUser[]): string | undefined {
  const member = memberUsers.find((item) => item.id === task.reporterId);
  return member?.displayName;
}

function resolveAssigneeDisplay(task: Task, memberUsers: MentionUser[]): string | undefined {
  if (task.assignee?.displayName) {
    return task.assignee.displayName;
  }
  if (!task.assigneeId) {
    return undefined;
  }
  const member = memberUsers.find((item) => item.id === task.assigneeId);
  return member?.displayName;
}

function formatMobileDate(value?: string | null): string {
  if (!value) {
    return 'No due date';
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function TaskDetailContent({
  projectId,
  taskId,
  variant,
  canEditTask = true,
  onClose,
  onOpenFullPage,
}: TaskDetailContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { user, activeOrganizationId } = useAuthStore();
  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);
  const canViewOrgMembers = permissionSet.has(MEMBERS_READ_PERMISSION);
  const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);

  const { data: project } = useProject(projectId);
  const { data: task, isLoading } = useTask(taskId);
  const { data: subtasks = [] } = useSubtasks(taskId);
  const { data: checklistData = [] } = useChecklists(taskId);
  const { data: dependencies } = useDependencies(taskId);
  const { data: comments = [] } = useComments(taskId);
  const { data: activity = [] } = useTaskActivity(taskId);
  const { data: attachments = [] } = useAttachments(taskId);

  const { data: orgMembers = [] } = useOrgMembers(
    canViewOrgMembers ? (activeOrganizationId ?? user?.organizationId) : undefined,
  );

  const updateTask = useUpdateTask(taskId);
  const toggleChecklistItem = useToggleItem();
  const createComment = useCreateComment(taskId);
  const uploadFile = useUploadFile(taskId);
  const deleteAttachment = useDeleteAttachment(taskId);
  const watchTask = useWatchTask(taskId);
  const unwatchTask = useUnwatchTask(taskId);

  const [localTask, setLocalTask] = useState<Task | null>(null);
  const [localChecklists, setLocalChecklists] = useState(checklistData);
  const [pendingChecklistIds, setPendingChecklistIds] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<UploadProgressItem[]>([]);
  const [watching, setWatching] = useState(false);
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setLocalTask(task);
      setWatching(task.assigneeId === user?.id || task.reporterId === user?.id);
    }
  }, [task, user?.id]);

  useEffect(() => {
    setLocalChecklists(checklistData);
  }, [checklistData]);

  const memberUsers: MentionUser[] = useMemo(
    () =>
      (canViewOrgMembers ? orgMembers : (project?.members ?? [])).map((member) => ({
        id: member.userId,
        displayName: member.displayName,
        email: 'email' in member && typeof member.email === 'string' ? member.email : '',
      })),
    [canViewOrgMembers, orgMembers, project?.members],
  );
  const finalStatusIds = useMemo(
    () => (project?.statuses ?? []).filter((status) => status.isFinal).map((status) => status.id),
    [project?.statuses],
  );

  const timelineItems = useMemo(
    () => buildTimelineEntries(activity, comments),
    [activity, comments],
  );

  async function uploadForEditor(file: File) {
    const uploaded = await uploadFile.mutateAsync({ file });
    return uploaded.url;
  }

  async function handleUploadFiles(files: File[]) {
    for (const file of files) {
      try {
        setUploadProgress((current) => updateUploadProgress(current, file.name, 0));
        await uploadFile.mutateAsync({
          file,
          onProgress: (progress) => {
            setUploadProgress((current) => updateUploadProgress(current, file.name, progress));
          },
        });
      } catch (error) {
        toast.error((error as Error).message || `Failed to upload ${file.name}`);
      } finally {
        setUploadProgress((current) => removeUploadProgress(current, file.name));
      }
    }
  }

  function handleTaskUpdate(patch: Partial<Task> & { labelIds?: string[] }) {
    if (!canUpdateTask) return;
    if (!localTask) return;

    const previous = localTask;
    const nextAssignee =
      patch.assigneeId === undefined
        ? localTask.assignee
        : patch.assigneeId
          ? (() => {
              const member = memberUsers.find((item) => item.id === patch.assigneeId);
              if (member) {
                return { id: member.id, displayName: member.displayName, avatarUrl: null };
              }
              if (localTask.assignee?.id === patch.assigneeId) {
                return localTask.assignee;
              }
              return null;
            })()
          : null;

    setLocalTask({
      ...localTask,
      ...patch,
      assignee: nextAssignee,
      updatedAt: new Date().toISOString(),
    });

    updateTask.mutate(patch, {
      onError: (_error) => {
        setLocalTask(previous);
      },
    });
  }

  function handleChecklistToggle(itemId: string, isCompleted: boolean) {
    if (!canUpdateTask) return;
    const previous = localChecklists;

    setPendingChecklistIds((current) => new Set(current).add(itemId));
    setLocalChecklists((current) => toggleChecklistItemOptimistic(current, itemId, isCompleted));

    toggleChecklistItem.mutate(
      { itemId, isCompleted, taskId },
      {
        onError: (_error) => {
          setLocalChecklists(previous);
        },
        onSettled: () => {
          setPendingChecklistIds((current) => {
            const next = new Set(current);
            next.delete(itemId);
            return next;
          });
        },
      },
    );
  }

  async function handleCreateComment(body: string) {
    if (!canUpdateTask) {
      return;
    }

    await createComment.mutateAsync({ body });
  }

  async function handleWatchToggle() {
    const next = !watching;
    setWatching(next);

    try {
      if (next) {
        await watchTask.mutateAsync();
      } else {
        await unwatchTask.mutateAsync();
      }
    } catch (error) {
      setWatching(!next);
    }
  }

  async function fetchMentionUsers(query: string) {
    const normalized = query.toLowerCase().trim();
    if (!normalized) {
      return memberUsers.slice(0, 8);
    }

    return memberUsers
      .filter(
        (item) =>
          item.displayName.toLowerCase().includes(normalized) ||
          item.email.toLowerCase().includes(normalized),
      )
      .slice(0, 8);
  }

  function isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getScopedVisibleElement(selector: string): HTMLElement | null {
    const scope = contentRef.current;
    const scopedMatches = scope ? Array.from(scope.querySelectorAll<HTMLElement>(selector)) : [];
    const scopedVisible = scopedMatches.find((element) => isVisible(element));
    if (scopedVisible) {
      return scopedVisible;
    }

    const globalMatches = Array.from(document.querySelectorAll<HTMLElement>(selector));
    return globalMatches.find((element) => isVisible(element)) ?? globalMatches[0] ?? null;
  }

  function focusElement(selector: string) {
    const element = getScopedVisibleElement(selector);
    if (!element) {
      return;
    }

    if (element instanceof HTMLButtonElement) {
      element.click();
      return;
    }

    element.focus();
  }

  useRegisterShortcut({
    id: `task-detail-${taskId}-assign`,
    scope: 'task-detail',
    key: 'a',
    preventDefault: true,
    enabled: canUpdateTask,
    handler: () => {
      focusElement('button[aria-label="Change assignee"]');
    },
  });

  useRegisterShortcut({
    id: `task-detail-${taskId}-labels`,
    scope: 'task-detail',
    key: 'l',
    preventDefault: true,
    enabled: canUpdateTask,
    handler: () => {
      focusElement('button[aria-label="Edit labels"]');
    },
  });

  useRegisterShortcut({
    id: `task-detail-${taskId}-status`,
    scope: 'task-detail',
    key: 's',
    preventDefault: true,
    enabled: canUpdateTask,
    handler: () => {
      const trigger =
        document.querySelector<HTMLElement>('button[aria-label="Task status"]') ??
        document.querySelector<HTMLElement>('button[aria-label="Change status"]');
      trigger?.click();
    },
  });

  useRegisterShortcut({
    id: `task-detail-${taskId}-comment`,
    scope: 'task-detail',
    key: 'c',
    preventDefault: true,
    enabled: canUpdateTask,
    handler: () => {
      focusElement('[data-shortcut-comment-input] [contenteditable="true"]');
    },
  });

  useRegisterShortcut({
    id: `task-detail-${taskId}-description`,
    scope: 'task-detail',
    key: 'e',
    preventDefault: true,
    enabled: canUpdateTask,
    handler: () => {
      focusElement('[data-shortcut-description] [contenteditable="true"]');
    },
  });

  if (isLoading || !localTask) {
    return (
      <div className="space-y-md p-lg">
        <Skeleton className="h-12 w-72 rounded-radius-lg" />
        <Skeleton className="h-60 w-full rounded-radius-lg" />
        <Skeleton className="h-44 w-full rounded-radius-lg" />
      </div>
    );
  }

  const isPanel = variant === 'panel';
  const createdByDisplay = resolveCreatedByDisplay(localTask, memberUsers);
  const assigneeDisplay = resolveAssigneeDisplay(localTask, memberUsers);

  return (
    <div ref={contentRef} className="flex h-full min-h-0 flex-col bg-surface-container-lowest">
      <TaskHeader
        variant={variant}
        taskId={localTask.id}
        title={localTask.title}
        statusId={localTask.statusId}
        priority={localTask.priority}
        taskForValidation={localTask}
        statuses={project?.statuses ?? []}
        projectName={project?.name}
        createdAt={localTask.createdAt}
        showOpenFullPage={isPanel}
        showCloseButton={isPanel}
        canEditTask={canUpdateTask}
        onTitleSave={(title) => handleTaskUpdate({ title })}
        onStatusChange={(statusId) => handleTaskUpdate({ statusId })}
        onOpenFullPage={onOpenFullPage}
        onClose={onClose}
      />

      <div
        className={cn(
          'min-h-0 flex-1 px-xl py-lg',
          isPanel ? 'overflow-y-auto' : 'overflow-visible',
        )}
      >
        <div
          className={cn(
            'grid gap-xl',
            isPanel ? 'grid-cols-1 md:grid-cols-10' : 'grid-cols-1 xl:grid-cols-12',
          )}
        >
          <div className={cn('space-y-xl', isPanel ? 'md:col-span-6' : 'xl:col-span-8')}>
            {!isPanel ? (
              <section className="grid grid-cols-2 gap-sm md:hidden">
                {canUpdateTask ? (
                  <AssigneePicker
                    taskId={localTask.id}
                    assigneeId={localTask.assigneeId}
                    members={project?.members ?? []}
                  >
                    <div className="space-y-sm rounded-radius-lg border border-border/20 bg-surface-container-low/50 p-md text-left">
                      <p className="text-label font-bold uppercase tracking-widest text-secondary">
                        Assignee
                      </p>
                      <p className="line-clamp-1 text-small font-medium text-foreground">
                        {assigneeDisplay ?? 'Unassigned'}
                      </p>
                    </div>
                  </AssigneePicker>
                ) : (
                  <div className="space-y-sm rounded-radius-lg border border-border/20 bg-surface-container-low/50 p-md text-left">
                    <p className="text-label font-bold uppercase tracking-widest text-secondary">
                      Assignee
                    </p>
                    <p className="line-clamp-1 text-small font-medium text-foreground">
                      {assigneeDisplay ?? 'Unassigned'}
                    </p>
                  </div>
                )}

                {canUpdateTask ? (
                  <PriorityPicker taskId={localTask.id} priority={localTask.priority}>
                    <div className="space-y-sm rounded-radius-lg border border-border/20 bg-surface-container-low/50 p-md text-left">
                      <p className="text-label font-bold uppercase tracking-widest text-secondary">
                        Priority
                      </p>
                      <p className="line-clamp-1 text-small font-medium capitalize text-foreground">
                        {localTask.priority}
                      </p>
                    </div>
                  </PriorityPicker>
                ) : (
                  <div className="space-y-sm rounded-radius-lg border border-border/20 bg-surface-container-low/50 p-md text-left">
                    <p className="text-label font-bold uppercase tracking-widest text-secondary">
                      Priority
                    </p>
                    <p className="line-clamp-1 text-small font-medium capitalize text-foreground">
                      {localTask.priority}
                    </p>
                  </div>
                )}

                {canUpdateTask ? (
                  <DueDatePicker taskId={localTask.id} dueDate={localTask.dueDate}>
                    <div className="space-y-sm rounded-radius-lg border border-border/20 bg-surface-container-low/50 p-md text-left">
                      <p className="text-label font-bold uppercase tracking-widest text-secondary">
                        Due date
                      </p>
                      <p className="line-clamp-1 text-small font-medium text-foreground">
                        {formatMobileDate(localTask.dueDate)}
                      </p>
                    </div>
                  </DueDatePicker>
                ) : (
                  <div className="space-y-sm rounded-radius-lg border border-border/20 bg-surface-container-low/50 p-md text-left">
                    <p className="text-label font-bold uppercase tracking-widest text-secondary">
                      Due date
                    </p>
                    <p className="line-clamp-1 text-small font-medium text-foreground">
                      {formatMobileDate(localTask.dueDate)}
                    </p>
                  </div>
                )}

                {canUpdateTask ? (
                  <LabelPicker
                    taskId={localTask.id}
                    selectedLabels={localTask.labels ?? []}
                    allLabels={project?.labels ?? []}
                  >
                    <div className="space-y-sm rounded-radius-lg border border-border/20 bg-surface-container-low/50 p-md text-left">
                      <p className="text-label font-bold uppercase tracking-widest text-secondary">
                        Labels
                      </p>
                      <p className="line-clamp-1 text-small font-medium text-foreground">
                        {(localTask.labels ?? []).length > 0
                          ? (localTask.labels ?? []).map((label) => label.name).join(', ')
                          : 'No labels'}
                      </p>
                    </div>
                  </LabelPicker>
                ) : (
                  <div className="space-y-sm rounded-radius-lg border border-border/20 bg-surface-container-low/50 p-md text-left">
                    <p className="text-label font-bold uppercase tracking-widest text-secondary">
                      Labels
                    </p>
                    <p className="line-clamp-1 text-small font-medium text-foreground">
                      {(localTask.labels ?? []).length > 0
                        ? (localTask.labels ?? []).map((label) => label.name).join(', ')
                        : 'No labels'}
                    </p>
                  </div>
                )}
              </section>
            ) : null}

            {!canViewOrgMembers ? (
              <p className="rounded-radius-md border border-border/30 bg-surface-container-low px-md py-sm text-label text-muted">
                Member directory access is limited. Mentions are available for project members only.
              </p>
            ) : null}

            <div data-shortcut-description>
              <TaskDescription
                value={localTask.description ?? ''}
                onSave={(description) => handleTaskUpdate({ description })}
                fetchMentionUsers={fetchMentionUsers}
                onImageUpload={uploadForEditor}
                editable={canUpdateTask}
              />
            </div>

            <ChecklistSection
              checklists={localChecklists}
              pendingItemIds={pendingChecklistIds}
              onToggleItem={handleChecklistToggle}
              readOnly={!canUpdateTask}
            />

            <DependencyList
              projectId={projectId}
              dependencies={dependencies}
              onAddDependency={canUpdateTask ? () => setDependencyDialogOpen(true) : undefined}
            />

            <CommentThread
              comments={comments}
              currentUserId={user?.id}
              composer={
                canUpdateTask ? (
                  <div className="hidden md:block" data-shortcut-comment-input>
                    <CommentInput
                      currentUserName={user?.displayName}
                      currentUserId={user?.id}
                      loading={createComment.isPending}
                      onSubmit={handleCreateComment}
                      fetchMentionUsers={fetchMentionUsers}
                      onImageUpload={uploadForEditor}
                    />
                  </div>
                ) : null
              }
            />

            <SubtaskList
              projectId={projectId}
              subtasks={subtasks}
              subtaskCount={localTask.progress?.subtaskCount ?? subtasks.length}
              subtaskCompletedCount={localTask.progress?.subtaskCompletedCount ?? 0}
              finalStatusIds={finalStatusIds}
              onCreateSubtask={canUpdateTask ? () => setSubtaskDialogOpen(true) : undefined}
            />

            {!isPanel ? <ActivityFeed items={timelineItems} /> : null}
          </div>

          {isPanel ? (
            <details className="group rounded-radius-lg border border-border/20 bg-surface-container-low/50 p-md md:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-xs text-small font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
                Task metadata
              </summary>
              <div className="mt-md">
                <TaskSidebar
                  task={localTask}
                  projectName={project?.name}
                  createdByDisplay={createdByDisplay}
                  members={project?.members ?? []}
                  allLabels={project?.labels ?? []}
                  attachments={attachments}
                  uploadProgress={uploadProgress}
                  watching={watching}
                  canEditTask={canUpdateTask}
                  onWatchToggle={() => {
                    void handleWatchToggle();
                  }}
                  onUploadFiles={handleUploadFiles}
                  onDeleteAttachment={(attachmentId) => {
                    deleteAttachment.mutate(attachmentId);
                  }}
                />
              </div>
            </details>
          ) : null}

          <div className={cn('hidden md:block', isPanel ? 'md:col-span-4' : 'xl:col-span-4')}>
            <TaskSidebar
              task={localTask}
              projectName={project?.name}
              createdByDisplay={createdByDisplay}
              members={project?.members ?? []}
              allLabels={project?.labels ?? []}
              attachments={attachments}
              uploadProgress={uploadProgress}
              watching={watching}
              canEditTask={canUpdateTask}
              onWatchToggle={() => {
                void handleWatchToggle();
              }}
              onUploadFiles={handleUploadFiles}
              onDeleteAttachment={(attachmentId) => {
                deleteAttachment.mutate(attachmentId);
              }}
            />
          </div>
        </div>
      </div>

      {canUpdateTask ? (
        <div
          className={cn(
            'border-t border-border/20 bg-surface-container-lowest px-md pb-md pt-sm md:hidden',
            isPanel ? 'sticky bottom-0' : 'sticky bottom-0',
          )}
        >
          <div data-shortcut-comment-input>
            <CommentInput
              currentUserName={user?.displayName}
              currentUserId={user?.id}
              loading={createComment.isPending}
              onSubmit={handleCreateComment}
              fetchMentionUsers={fetchMentionUsers}
              onImageUpload={uploadForEditor}
              stickyMobile
            />
          </div>
        </div>
      ) : null}

      {canUpdateTask ? (
        <CreateTaskDialog
          open={subtaskDialogOpen}
          onOpenChange={setSubtaskDialogOpen}
          projectId={projectId}
          parentTaskId={taskId}
          dialogTitle="Create Subtask"
          dialogDescription="Add a child task under the current task."
          submitLabel="Create Subtask"
          statuses={project?.statuses ?? []}
          members={project?.members ?? []}
          labels={project?.labels ?? []}
        />
      ) : null}

      {canUpdateTask ? (
        <AddDependencyDialog
          open={dependencyDialogOpen}
          onOpenChange={setDependencyDialogOpen}
          projectId={projectId}
          taskId={taskId}
        />
      ) : null}
    </div>
  );
}
