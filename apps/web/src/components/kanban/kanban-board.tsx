import type { Label, ProjectMember, WorkflowStatus } from '@/api/projects';
import {
  type Priority,
  type Task,
  type TaskFilters,
  getBlockedStatusTransitionMessage,
  isStatusTransitionBlocked,
  useBoardTasks,
  useBulkUpdateTasks,
  useMoveTask,
} from '@/api/tasks';
import { KanbanCardOverlay } from '@/components/kanban/kanban-card';
import { KanbanColumn } from '@/components/kanban/kanban-column';
import {
  type DragPreviewSnapshot,
  computeDragPreviewUpdate,
} from '@/components/kanban/kanban-drag-preview';
import { useRegisterShortcut } from '@/components/shortcuts/shortcut-provider';
import { useFocusedTask } from '@/hooks/use-focused-task';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import {
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { PRIORITY_KEY_TO_PRIORITY, TASK_UPDATE_PERMISSION } from '@taskforge/shared';
import { Settings } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface KanbanBoardProps {
  projectId: string;
  statuses: WorkflowStatus[];
  members: ProjectMember[];
  allLabels: Label[];
  filters?: TaskFilters;
  onTaskClick: (taskId: string) => void;
  onAddTask?: (statusId: string) => void;
  onNavigateToSettings?: () => void;
  canCreateTask?: boolean;
  canUpdateTask?: boolean;
}

export function KanbanBoard({
  projectId,
  statuses,
  members,
  allLabels,
  filters,
  onTaskClick,
  onAddTask,
  onNavigateToSettings,
  canCreateTask = true,
  canUpdateTask = true,
}: KanbanBoardProps) {
  const user = useAuthStore((state) => state.user);
  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);
  const canDragAndDrop = canUpdateTask && permissionSet.has(TASK_UPDATE_PERMISSION);

  // Original task captured at drag start — never mutated during drag
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  // Live copy of task lists updated during drag for visual cross-column shifting
  const [activeTasksByStatus, setActiveTasksByStatus] = useState<Map<string, Task[]> | null>(null);
  // Guards repeated dragOver events that resolve to the same preview state.
  const lastPreviewKeyRef = useRef<string | null>(null);
  // Coalesces dragOver event storms into at most one state update per animation frame.
  const pendingDragPreviewRef = useRef<DragPreviewSnapshot | null>(null);
  const dragPreviewFrameRef = useRef<number | null>(null);

  // Prefer whatever is literally under the pointer; fall back to closest corners.
  // When both a card and its parent column are hit, prefer the card.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const hits = pointerWithin(args);
    if (hits.length > 0) {
      const cardHit = hits.find(({ id }) => !String(id).startsWith('column-'));
      return cardHit ? [cardHit] : hits;
    }
    return closestCorners(args);
  }, []);

  const {
    data: boardData,
    isLoading,
    loadMore,
    loadingMoreByStatus,
  } = useBoardTasks(projectId, filters, 15);
  const moveTask = useMoveTask();
  const bulkUpdateTasks = useBulkUpdateTasks();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 2 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /** Group tasks by statusId, ordered by position */
  const tasksByStatus = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    for (const status of statuses) {
      grouped.set(status.id, []);
    }
    for (const column of boardData?.columns ?? []) {
      const bucket = grouped.get(column.statusId);
      if (!bucket) continue;
      bucket.push(...column.items);
    }
    for (const [, bucket] of grouped) {
      bucket.sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [boardData, statuses]);

  const columnMetaByStatus = useMemo(() => {
    const meta = new Map<
      string,
      { hasMore: boolean; totalCount: number; nextUnloadedTaskId: string | null }
    >();
    for (const column of boardData?.columns ?? []) {
      meta.set(column.statusId, {
        hasMore: column.meta.hasMore,
        totalCount: column.meta.totalCount,
        nextUnloadedTaskId: column.meta.nextUnloadedTaskId,
      });
    }
    return meta;
  }, [boardData]);

  // What gets rendered — live during drag, server data otherwise
  const displayTasks = activeTasksByStatus ?? tasksByStatus;
  const visibleTaskIds = useMemo(
    () => statuses.flatMap((status) => (displayTasks.get(status.id) ?? []).map((task) => task.id)),
    [displayTasks, statuses],
  );
  const { focusedTaskId, setFocusedTaskId, focusNextTask, focusPreviousTask } =
    useFocusedTask(visibleTaskIds);

  const cancelPendingDragPreview = useCallback(() => {
    pendingDragPreviewRef.current = null;
    if (dragPreviewFrameRef.current !== null) {
      cancelAnimationFrame(dragPreviewFrameRef.current);
      dragPreviewFrameRef.current = null;
    }
  }, []);

  const resetDragState = useCallback(() => {
    setActiveTask(null);
    setActiveTasksByStatus(null);
    lastPreviewKeyRef.current = null;
    cancelPendingDragPreview();
  }, [cancelPendingDragPreview]);

  useEffect(
    () => () => {
      cancelPendingDragPreview();
    },
    [cancelPendingDragPreview],
  );

  const applyDragPreview = useCallback(
    (snapshot: DragPreviewSnapshot) => {
      setActiveTasksByStatus((prev) => {
        const base = prev ?? tasksByStatus;
        const result = computeDragPreviewUpdate({
          base,
          snapshot,
          lastPreviewKey: lastPreviewKeyRef.current,
        });
        if (!result.changed) return prev;
        lastPreviewKeyRef.current = result.previewKey;
        return result.next;
      });
    },
    [tasksByStatus],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = (event.active.data.current as { task?: Task } | undefined)?.task;
      setActiveTask(task ?? null);
      setActiveTasksByStatus(new Map(tasksByStatus));
      lastPreviewKeyRef.current = null;
    },
    [tasksByStatus],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !active) return;

      const activeData = active.data.current as { type: string; task?: Task } | undefined;
      if (!activeData?.task) return;
      const draggedTaskId = activeData.task.id;
      // Original statusId — used to distinguish native within-column drags (skip)
      // from repositioning within a foreign column the task was just moved into (handle)
      const originalStatusId = activeTask?.statusId;

      const overData = over.data.current as
        | { type: string; statusId?: string; task?: Task }
        | undefined;

      let targetStatusId: string | undefined;
      let overTaskId: string | null = null;

      if (overData?.type === 'column') {
        targetStatusId = overData.statusId;
      } else if (overData?.type === 'card' && overData.task) {
        targetStatusId = overData.task.statusId;
        overTaskId = overData.task.id;
      }

      if (!targetStatusId) return;
      pendingDragPreviewRef.current = {
        draggedTaskId,
        targetStatusId,
        overTaskId,
        originalStatusId,
      };

      if (dragPreviewFrameRef.current !== null) return;

      dragPreviewFrameRef.current = requestAnimationFrame(() => {
        dragPreviewFrameRef.current = null;
        const snapshot = pendingDragPreviewRef.current;
        pendingDragPreviewRef.current = null;
        if (!snapshot) return;
        applyDragPreview(snapshot);
      });
    },
    [activeTask, applyDragPreview],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const originalTask = activeTask;
      const finalTasksByStatus = activeTasksByStatus ?? tasksByStatus;
      const { over } = event;

      if (!over || !originalTask) {
        resetDragState();
        return;
      }

      let targetStatusId = originalTask.statusId;
      for (const [statusId, columnTasks] of finalTasksByStatus) {
        if (columnTasks.some((task) => task.id === originalTask.id)) {
          targetStatusId = statusId;
          break;
        }
      }

      const finalColumnTasks = finalTasksByStatus.get(targetStatusId) ?? [];
      const targetIndex = finalColumnTasks.findIndex((task) => task.id === originalTask.id);
      if (targetIndex === -1) {
        resetDragState();
        return;
      }

      const initialColumnTasks = tasksByStatus.get(originalTask.statusId) ?? [];
      const initialIndex = initialColumnTasks.findIndex((task) => task.id === originalTask.id);
      if (targetStatusId === originalTask.statusId && targetIndex === initialIndex) {
        resetDragState();
        return;
      }

      if (targetStatusId !== originalTask.statusId) {
        const targetStatus = statuses.find((status) => status.id === targetStatusId);
        if (targetStatus) {
          const eligibility = isStatusTransitionBlocked(originalTask, targetStatus);
          if (eligibility.blocked) {
            toast.info(getBlockedStatusTransitionMessage(targetStatus.name, eligibility));
            resetDragState();
            return;
          }
        }
      }

      const afterTaskId = finalColumnTasks[targetIndex - 1]?.id;
      let beforeTaskId = finalColumnTasks[targetIndex + 1]?.id;
      if (!beforeTaskId) {
        const meta = columnMetaByStatus.get(targetStatusId);
        if (meta?.hasMore && meta.nextUnloadedTaskId) {
          beforeTaskId = meta.nextUnloadedTaskId;
        }
      }

      const payload = {
        taskId: originalTask.id,
        statusId: targetStatusId,
        beforeTaskId,
        afterTaskId,
        projectId,
      };

      resetDragState();
      moveTask.mutate(payload);
    },
    [
      activeTask,
      activeTasksByStatus,
      columnMetaByStatus,
      statuses,
      tasksByStatus,
      moveTask,
      projectId,
      resetDragState,
    ],
  );

  const handleDragCancel = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  const applyFocusedPriority = useCallback(
    (priority: Priority) => {
      if (!focusedTaskId || !canUpdateTask) {
        return;
      }

      bulkUpdateTasks.mutate({
        ids: [focusedTaskId],
        data: { priority },
        projectId,
      });
    },
    [bulkUpdateTasks, canUpdateTask, focusedTaskId, projectId],
  );

  useRegisterShortcut({
    id: 'kanban.focus-next',
    scope: 'board',
    key: 'j',
    preventDefault: true,
    handler: focusNextTask,
  });

  useRegisterShortcut({
    id: 'kanban.focus-previous',
    scope: 'board',
    key: 'k',
    preventDefault: true,
    handler: focusPreviousTask,
  });

  useRegisterShortcut({
    id: 'kanban.open-focused-task',
    scope: 'board',
    key: 'enter',
    preventDefault: true,
    handler: () => {
      if (focusedTaskId) {
        onTaskClick(focusedTaskId);
      }
    },
  });

  useRegisterShortcut({
    id: 'kanban.priority-critical',
    scope: 'board',
    key: '1',
    preventDefault: true,
    handler: () => applyFocusedPriority(PRIORITY_KEY_TO_PRIORITY['1']),
  });
  useRegisterShortcut({
    id: 'kanban.priority-high',
    scope: 'board',
    key: '2',
    preventDefault: true,
    handler: () => applyFocusedPriority(PRIORITY_KEY_TO_PRIORITY['2']),
  });
  useRegisterShortcut({
    id: 'kanban.priority-medium',
    scope: 'board',
    key: '3',
    preventDefault: true,
    handler: () => applyFocusedPriority(PRIORITY_KEY_TO_PRIORITY['3']),
  });
  useRegisterShortcut({
    id: 'kanban.priority-low',
    scope: 'board',
    key: '4',
    preventDefault: true,
    handler: () => applyFocusedPriority(PRIORITY_KEY_TO_PRIORITY['4']),
  });
  useRegisterShortcut({
    id: 'kanban.priority-none',
    scope: 'board',
    key: '5',
    preventDefault: true,
    handler: () => applyFocusedPriority(PRIORITY_KEY_TO_PRIORITY['5']),
  });

  useEffect(() => {
    if (!focusedTaskId) {
      return;
    }

    const focusedCard = document.querySelector<HTMLElement>(
      `[data-task-id="${focusedTaskId}"][data-shortcut-focus="true"]`,
    );
    focusedCard?.focus();
  }, [focusedTaskId]);

  // ─── Empty state: no statuses configured ─────────────────────────────────────

  if (statuses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="mb-xs text-heading-3 font-semibold text-foreground">No workflow configured</p>
        <p className="mb-lg text-body text-secondary">
          Add statuses to your project workflow to start using the Kanban board.
        </p>
        {onNavigateToSettings && (
          <button
            type="button"
            onClick={onNavigateToSettings}
            className="inline-flex items-center gap-sm rounded-radius-md bg-brand-primary px-md py-sm text-body font-medium text-white hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Settings className="size-4" />
            Configure Workflow
          </button>
        )}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={canDragAndDrop ? handleDragStart : undefined}
      onDragOver={canDragAndDrop ? handleDragOver : undefined}
      onDragEnd={canDragAndDrop ? handleDragEnd : undefined}
      onDragCancel={canDragAndDrop ? handleDragCancel : undefined}
    >
      <div
        className={cn(
          'flex h-full min-h-0 items-start gap-md overflow-x-auto overflow-y-hidden',
          'snap-x snap-mandatory md:snap-none',
        )}
      >
        {statuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            tasks={displayTasks.get(status.id) ?? []}
            members={members}
            allLabels={allLabels}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask ?? (() => {})}
            canCreateTask={canCreateTask}
            canEditTask={canDragAndDrop}
            isLoading={isLoading}
            hasMore={columnMetaByStatus.get(status.id)?.hasMore ?? false}
            totalCount={columnMetaByStatus.get(status.id)?.totalCount}
            isLoadingMore={Boolean(loadingMoreByStatus[status.id])}
            onLoadMore={() => void loadMore(status.id)}
            focusedTaskId={focusedTaskId}
            onTaskFocus={setFocusedTaskId}
          />
        ))}
      </div>

      <DragOverlay>{activeTask ? <KanbanCardOverlay task={activeTask} /> : null}</DragOverlay>
    </DndContext>
  );
}
