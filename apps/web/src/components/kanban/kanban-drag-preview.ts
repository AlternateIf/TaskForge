import type { Task } from '@/api/tasks';

export interface DragPreviewSnapshot {
  draggedTaskId: string;
  targetStatusId: string;
  overTaskId: string | null;
  originalStatusId?: string;
}

export function findTaskStatusId(
  byStatus: Map<string, Task[]>,
  taskId: string,
): string | undefined {
  for (const [statusId, tasks] of byStatus) {
    if (tasks.some((task) => task.id === taskId)) return statusId;
  }
  return undefined;
}

export function areTaskMapsEquivalent(a: Map<string, Task[]>, b: Map<string, Task[]>): boolean {
  if (a.size !== b.size) return false;
  for (const [statusId, aTasks] of a) {
    const bTasks = b.get(statusId);
    if (!bTasks || aTasks.length !== bTasks.length) return false;
    for (let i = 0; i < aTasks.length; i += 1) {
      if (aTasks[i].id !== bTasks[i].id || aTasks[i].statusId !== bTasks[i].statusId) {
        return false;
      }
    }
  }
  return true;
}

export function computeDragPreviewUpdate({
  base,
  snapshot,
  lastPreviewKey,
}: {
  base: Map<string, Task[]>;
  snapshot: DragPreviewSnapshot;
  lastPreviewKey: string | null;
}):
  | { changed: false }
  | {
      changed: true;
      next: Map<string, Task[]>;
      previewKey: string;
    } {
  const { draggedTaskId, targetStatusId, overTaskId, originalStatusId } = snapshot;

  const currentStatusId = findTaskStatusId(base, draggedTaskId);
  if (!currentStatusId) return { changed: false };

  // Skip native within-column reorders — SortableContext handles those via CSS transforms.
  // But if the task was moved here from another column, we DO need to reorder it.
  if (currentStatusId === targetStatusId && currentStatusId === originalStatusId) {
    return { changed: false };
  }

  // Skip when hovering over the dragged task itself.
  if (overTaskId === draggedTaskId) return { changed: false };

  const previewKey = `${draggedTaskId}|${currentStatusId}|${targetStatusId}|${overTaskId ?? 'column'}`;
  if (lastPreviewKey === previewKey) return { changed: false };

  const newMap = new Map(base);
  const draggedTask = (newMap.get(currentStatusId) ?? []).find((t) => t.id === draggedTaskId);
  if (!draggedTask) return { changed: false };

  // Remove from current column
  newMap.set(
    currentStatusId,
    (newMap.get(currentStatusId) ?? []).filter((t) => t.id !== draggedTaskId),
  );

  // Insert into target column
  const targetCol = (newMap.get(targetStatusId) ?? []).filter((t) => t.id !== draggedTaskId);
  const updatedTask = { ...draggedTask, statusId: targetStatusId };

  if (overTaskId) {
    const overIdx = targetCol.findIndex((t) => t.id === overTaskId);
    targetCol.splice(overIdx === -1 ? targetCol.length : overIdx, 0, updatedTask);
  } else {
    targetCol.push(updatedTask);
  }

  newMap.set(targetStatusId, targetCol);
  if (areTaskMapsEquivalent(base, newMap)) return { changed: false };

  return { changed: true, next: newMap, previewKey };
}
