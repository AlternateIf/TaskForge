import type { Label, ProjectMember, WorkflowStatus } from '@/api/projects';
import { type Task, type TaskFilters, taskKeys, useMoveTask, useTasks } from '@/api/tasks';
import { KanbanCardOverlay } from '@/components/kanban/kanban-card';
import { KanbanColumn } from '@/components/kanban/kanban-column';
import { cn } from '@/lib/utils';
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
import { useQueryClient } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface KanbanBoardProps {
  projectId: string;
  statuses: WorkflowStatus[];
  members: ProjectMember[];
  allLabels: Label[];
  filters?: TaskFilters;
  onTaskClick: (taskId: string) => void;
  onAddTask?: (statusId: string) => void;
  onNavigateToSettings?: () => void;
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
}: KanbanBoardProps) {
  // Original task captured at drag start — never mutated during drag
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  // Live copy of task lists updated during drag for visual cross-column shifting
  const [activeTasksByStatus, setActiveTasksByStatus] = useState<Map<string, Task[]> | null>(null);

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

  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useTasks(projectId, filters);
  const moveTask = useMoveTask();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
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
    for (const task of tasks ?? []) {
      const bucket = grouped.get(task.statusId);
      if (bucket) bucket.push(task);
    }
    for (const [, bucket] of grouped) {
      bucket.sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [tasks, statuses]);

  // What gets rendered — live during drag, server data otherwise
  const displayTasks = activeTasksByStatus ?? tasksByStatus;

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = (event.active.data.current as { task?: Task } | undefined)?.task;
      if (task) setActiveTask(task);
      setActiveTasksByStatus(new Map(tasksByStatus));
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

      setActiveTasksByStatus((prev) => {
        const target = targetStatusId;
        if (!target) return prev;
        const base = prev ?? tasksByStatus;

        // Find which column the dragged task currently lives in
        let currentStatusId: string | undefined;
        for (const [sid, col] of base) {
          if (col.some((t) => t.id === draggedTaskId)) {
            currentStatusId = sid;
            break;
          }
        }
        if (!currentStatusId) return prev;

        // Skip native within-column reorders — SortableContext handles those via CSS transforms.
        // But if the task was moved here from another column, we DO need to reorder it.
        if (currentStatusId === target && currentStatusId === originalStatusId) return prev;
        // Skip when hovering over the dragged task itself — prevents a feedback loop where
        // repositioning the card shifts the layout and immediately triggers another dragOver.
        if (overTaskId === draggedTaskId) return prev;

        const newMap = new Map(base);

        // The task object as it exists in the current live state
        const draggedTask = (newMap.get(currentStatusId) ?? []).find((t) => t.id === draggedTaskId);
        if (!draggedTask) return prev;

        // Remove from current column
        newMap.set(
          currentStatusId,
          (newMap.get(currentStatusId) ?? []).filter((t) => t.id !== draggedTaskId),
        );

        // Build target column, insert at hovered position
        const targetCol = (newMap.get(target) ?? []).filter((t) => t.id !== draggedTaskId);
        const updatedTask = { ...draggedTask, statusId: target };

        if (overTaskId) {
          const overIdx = targetCol.findIndex((t) => t.id === overTaskId);
          targetCol.splice(overIdx === -1 ? targetCol.length : overIdx, 0, updatedTask);
        } else {
          targetCol.push(updatedTask);
        }

        newMap.set(target, targetCol);
        return newMap;
      });
    },
    [tasksByStatus, activeTask],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      // Use the original task (captured at drag start) as source of truth —
      // active.data.current.task may have been mutated by handleDragOver re-renders.
      const originalTask = activeTask;
      const finalTasksByStatus = activeTasksByStatus ?? tasksByStatus;

      const { over } = event;
      if (!over || !originalTask) {
        setActiveTask(null);
        setActiveTasksByStatus(null);
        return;
      }

      // Detect if the task crossed into a different column during the drag
      let finalStatusId = originalTask.statusId;
      for (const [sid, col] of finalTasksByStatus) {
        if (col.some((t) => t.id === originalTask.id)) {
          finalStatusId = sid;
          break;
        }
      }

      let targetStatusId = originalTask.statusId;
      let targetPosition = originalTask.position;

      if (finalStatusId !== originalTask.statusId) {
        // Cross-column drop: compute position from live neighbors
        targetStatusId = finalStatusId;
        const finalCol = finalTasksByStatus.get(finalStatusId) ?? [];
        const idx = finalCol.findIndex((t) => t.id === originalTask.id);
        const prev = finalCol[idx - 1];
        const next = finalCol[idx + 1];

        if (prev && next) {
          targetPosition = (prev.position + next.position) / 2;
        } else if (prev) {
          targetPosition = prev.position + 1000;
        } else if (next) {
          targetPosition = Math.max(0, next.position - 1000);
        } else {
          targetPosition = 1000;
        }
      } else {
        // Within-column drop: use over event data (SortableContext handled the visual)
        const overData = over.data.current as
          | { type: string; statusId?: string; task?: Task }
          | undefined;

        if (overData?.type === 'column') {
          targetStatusId = overData.statusId ?? originalTask.statusId;
          const columnTasks = (finalTasksByStatus.get(targetStatusId) ?? []).filter(
            (t) => t.id !== originalTask.id,
          );
          targetPosition = (columnTasks[columnTasks.length - 1]?.position ?? 0) + 1000;
        } else if (overData?.type === 'card' && overData.task) {
          targetStatusId = overData.task.statusId;
          targetPosition = overData.task.position;
        }
      }

      if (targetStatusId === originalTask.statusId && targetPosition === originalTask.position) {
        return;
      }

      const roundedPosition = Math.round(targetPosition);

      // Pre-update the query cache synchronously so that when activeTasksByStatus
      // is cleared below, tasksByStatus already reflects the new position.
      // Without this there is one render frame where the card snaps back.
      queryClient.setQueriesData<Task[]>({ queryKey: taskKeys.forProject(projectId) }, (old) =>
        old?.map((t) =>
          t.id === originalTask.id
            ? { ...t, statusId: targetStatusId, position: roundedPosition }
            : t,
        ),
      );

      setActiveTask(null);
      setActiveTasksByStatus(null);

      moveTask.mutate({
        taskId: originalTask.id,
        statusId: targetStatusId,
        position: roundedPosition,
        projectId,
      });
    },
    [activeTask, activeTasksByStatus, tasksByStatus, queryClient, moveTask, projectId],
  );

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
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn('flex gap-md overflow-x-auto pb-md', 'snap-x snap-mandatory md:snap-none')}
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
            isLoading={isLoading}
          />
        ))}
      </div>

      <DragOverlay>{activeTask ? <KanbanCardOverlay task={activeTask} /> : null}</DragOverlay>
    </DndContext>
  );
}
