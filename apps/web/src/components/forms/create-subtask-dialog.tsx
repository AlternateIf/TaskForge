import type { WorkflowStatus } from '@/api/projects';
import { type Priority, useCreateSubtask } from '@/api/tasks';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

interface CreateSubtaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentTaskId: string;
  statuses: WorkflowStatus[];
}

const PRIORITIES: Priority[] = ['none', 'low', 'medium', 'high', 'critical'];

export function CreateSubtaskDialog({
  open,
  onOpenChange,
  parentTaskId,
  statuses,
}: CreateSubtaskDialogProps) {
  const [title, setTitle] = useState('');
  const [statusId, setStatusId] = useState(statuses[0]?.id ?? '');
  const [priority, setPriority] = useState<Priority>('none');

  const createSubtask = useCreateSubtask(parentTaskId);

  function reset() {
    setTitle('');
    setStatusId(statuses[0]?.id ?? '');
    setPriority('none');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      toast.error('Subtask title is required');
      return;
    }

    createSubtask.mutate(
      {
        title: title.trim(),
        statusId: statusId || undefined,
        priority,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Subtask</DialogTitle>
          <DialogDescription>Add a child task under the current task.</DialogDescription>
        </DialogHeader>

        <form className="space-y-md" onSubmit={submit}>
          <div className="space-y-xs">
            <Label htmlFor="subtask-title">Title</Label>
            <Input
              id="subtask-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Write unit tests for OAuth callback"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xs">
              <Label htmlFor="subtask-status">Status</Label>
              <select
                id="subtask-status"
                value={statusId}
                onChange={(event) => setStatusId(event.target.value)}
                className="h-9 w-full rounded-radius-md border border-border bg-surface-container-lowest px-sm text-body text-foreground"
              >
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-xs">
              <Label htmlFor="subtask-priority">Priority</Label>
              <select
                id="subtask-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
                className="h-9 w-full rounded-radius-md border border-border bg-surface-container-lowest px-sm text-body text-foreground"
              >
                {PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createSubtask.isPending}>
              Create subtask
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
