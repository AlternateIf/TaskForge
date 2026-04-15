import { useCallback, useEffect, useMemo, useState } from 'react';

export interface UseFocusedTaskResult {
  focusedTaskId: string | null;
  setFocusedTaskId: (taskId: string | null) => void;
  focusNextTask: () => void;
  focusPreviousTask: () => void;
}

export function useFocusedTask(taskIds: string[]): UseFocusedTaskResult {
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  const orderedIds = useMemo(() => taskIds.filter(Boolean), [taskIds]);

  useEffect(() => {
    if (orderedIds.length === 0) {
      setFocusedTaskId(null);
      return;
    }

    setFocusedTaskId((current) => {
      if (current && orderedIds.includes(current)) {
        return current;
      }
      return orderedIds[0] ?? null;
    });
  }, [orderedIds]);

  const focusNextTask = useCallback(() => {
    if (orderedIds.length === 0) {
      return;
    }

    setFocusedTaskId((current) => {
      if (!current) {
        return orderedIds[0] ?? null;
      }
      const index = orderedIds.indexOf(current);
      const nextIndex = index === -1 ? 0 : (index + 1) % orderedIds.length;
      return orderedIds[nextIndex] ?? null;
    });
  }, [orderedIds]);

  const focusPreviousTask = useCallback(() => {
    if (orderedIds.length === 0) {
      return;
    }

    setFocusedTaskId((current) => {
      if (!current) {
        return orderedIds[orderedIds.length - 1] ?? null;
      }
      const index = orderedIds.indexOf(current);
      const previousIndex = index <= 0 ? orderedIds.length - 1 : index - 1;
      return orderedIds[previousIndex] ?? null;
    });
  }, [orderedIds]);

  return {
    focusedTaskId,
    setFocusedTaskId,
    focusNextTask,
    focusPreviousTask,
  };
}
