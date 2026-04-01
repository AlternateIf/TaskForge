import type { Label, ProjectMember, WorkflowStatus } from '@/api/projects';
import { type Priority, useCreateTask } from '@/api/tasks';
import { PriorityBadge } from '@/components/priority-badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label as FormLabel } from '@/components/ui/label';
import { type FormEvent, useEffect, useState } from 'react';

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low', 'none'];

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  defaultStatusId?: string;
  statuses: WorkflowStatus[];
  members: ProjectMember[];
  labels: Label[];
  onSuccess?: (taskId: string) => void;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  defaultStatusId,
  statuses,
  members,
  labels,
  onSuccess,
}: CreateTaskDialogProps) {
  const firstStatusId = statuses[0]?.id ?? '';
  const [title, setTitle] = useState('');
  const [statusId, setStatusId] = useState(defaultStatusId ?? firstStatusId);
  const [priority, setPriority] = useState<Priority>('medium');

  useEffect(() => {
    if (open) setStatusId(defaultStatusId ?? firstStatusId);
  }, [open, defaultStatusId, firstStatusId]);
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const createTask = useCreateTask();

  function toggleLabel(id: string) {
    setSelectedLabelIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createTask.mutate(
      {
        projectId,
        title: title.trim(),
        statusId: statusId || undefined,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
      },
      {
        onSuccess: (task) => {
          setTitle('');
          setStatusId(defaultStatusId ?? firstStatusId);
          setPriority('medium');
          setAssigneeId('');
          setDueDate('');
          setSelectedLabelIds([]);
          onOpenChange(false);
          onSuccess?.(task.id);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <FormLabel htmlFor="task-title">
              Title{' '}
              <span className="text-danger" aria-hidden>
                *
              </span>
            </FormLabel>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
              autoFocus
            />
          </div>

          {statuses.length > 0 && (
            <div className="flex flex-col gap-xs">
              <FormLabel htmlFor="task-status">Status</FormLabel>
              <select
                id="task-status"
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="h-9 rounded-radius-md border border-border bg-surface-container-lowest px-sm text-body focus:outline-2 focus:outline-ring"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-xs">
            <FormLabel>Priority</FormLabel>
            <div className="flex flex-wrap gap-xs">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={
                    priority === p ? 'ring-2 ring-ring ring-offset-1 rounded-radius-sm' : ''
                  }
                  aria-pressed={priority === p}
                >
                  <PriorityBadge priority={p} showDot />
                </button>
              ))}
            </div>
          </div>

          {members.length > 0 && (
            <div className="flex flex-col gap-xs">
              <FormLabel htmlFor="task-assignee">Assignee</FormLabel>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="h-9 rounded-radius-md border border-border bg-surface-container-lowest px-sm text-body focus:outline-2 focus:outline-ring"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-xs">
            <FormLabel htmlFor="task-due-date">Due Date</FormLabel>
            <Input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-auto"
            />
          </div>

          {labels.length > 0 && (
            <div className="flex flex-col gap-xs">
              <FormLabel>Labels</FormLabel>
              <div className="flex flex-wrap gap-xs">
                {labels.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleLabel(l.id)}
                    aria-pressed={selectedLabelIds.includes(l.id)}
                    className="inline-flex items-center gap-xs rounded-full px-sm py-0.5 text-label font-medium transition-opacity"
                    style={{
                      backgroundColor: `${l.color}22`,
                      color: l.color,
                      outline: selectedLabelIds.includes(l.id) ? `2px solid ${l.color}` : undefined,
                    }}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!title.trim() || createTask.isPending}
            >
              {createTask.isPending ? 'Creating…' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
