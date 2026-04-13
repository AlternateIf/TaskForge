import { useCreateProject } from '@/api/projects';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/auth.store';
import { PROJECT_CREATE_PERMISSION } from '@taskforge/shared';
import { type FormEvent, useMemo, useState } from 'react';

const DEFAULT_PROJECT_COLOR = '#3b82f6';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (projectId: string) => void;
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_PROJECT_COLOR);
  const createProject = useCreateProject();
  const user = useAuthStore((s) => s.user);
  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);
  const canCreate = permissionSet.has(PROJECT_CREATE_PERMISSION);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createProject.mutate(
      { name: name.trim(), description: description.trim() || undefined, color },
      {
        onSuccess: (project) => {
          setName('');
          setDescription('');
          setColor(DEFAULT_PROJECT_COLOR);
          onOpenChange(false);
          onSuccess?.(project.id);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <Label htmlFor="project-name">
              Name{' '}
              <span className="text-danger" aria-hidden>
                *
              </span>
            </Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-xs">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-xs">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} className="w-full" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!canCreate || !name.trim() || createProject.isPending}
            >
              {createProject.isPending ? 'Creating…' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
