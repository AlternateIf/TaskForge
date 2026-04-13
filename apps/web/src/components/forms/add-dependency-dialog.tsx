import { useAddDependency } from '@/api/dependencies';
import { useTasks } from '@/api/tasks';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface AddDependencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  taskId: string;
}

export function AddDependencyDialog({
  open,
  onOpenChange,
  projectId,
  taskId,
}: AddDependencyDialogProps) {
  const [dependsOnTaskId, setDependsOnTaskId] = useState('');
  const { data: tasks } = useTasks(projectId);
  const addDependency = useAddDependency(taskId);

  const candidateTasks = useMemo(
    () => (tasks ?? []).filter((task) => task.id !== taskId),
    [tasks, taskId],
  );

  useEffect(() => {
    if (candidateTasks.length > 0) {
      setDependsOnTaskId(candidateTasks[0].id);
    }
  }, [candidateTasks]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dependsOnTaskId) {
      toast.error('Select a task to depend on');
      return;
    }

    addDependency.mutate(dependsOnTaskId, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Dependency</DialogTitle>
          <DialogDescription>Mark this task as blocked by another task.</DialogDescription>
        </DialogHeader>

        <form className="space-y-md" onSubmit={submit}>
          <div className="space-y-xs">
            <Label htmlFor="dependency-task">Blocked by</Label>
            <select
              id="dependency-task"
              value={dependsOnTaskId}
              onChange={(event) => setDependsOnTaskId(event.target.value)}
              className="h-9 w-full rounded-radius-md border border-border bg-surface-container-lowest px-sm text-body text-foreground"
              disabled={candidateTasks.length === 0}
            >
              {candidateTasks.length === 0 ? (
                <option value="">No tasks available</option>
              ) : (
                candidateTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={addDependency.isPending}
              disabled={candidateTasks.length === 0}
            >
              Add dependency
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
