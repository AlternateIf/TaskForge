import {
  type Label,
  type ProjectMember,
  type WorkflowStatus,
  useAddProjectMember,
  useProject,
  useRemoveProjectMember,
  useUpdateProject,
  useUpdateProjectLabels,
  useUpdateProjectStatuses,
} from '@/api/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as FormLabel } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { cn } from '@/lib/utils';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, GripVertical, Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

const PROJECT_COLORS = [
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#64748B',
];

const LABEL_COLORS = [
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
];

const ROLES: ProjectMember['role'][] = ['owner', 'admin', 'member', 'viewer'];

// ─── Sortable status row ──────────────────────────────────────────────────────

function SortableStatusRow({
  status,
  onNameChange,
  onColorChange,
  onRemove,
}: {
  status: WorkflowStatus;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-sm rounded-radius-md border border-border bg-surface-container-lowest p-sm',
        isDragging && 'opacity-50 shadow-2',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="cursor-grab text-muted hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
      {/* Color picker */}
      <div className="flex items-center gap-xs">
        {LABEL_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onColorChange(c)}
            className={cn(
              'size-5 rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring',
              status.color === c && 'ring-2 ring-offset-1 ring-brand-primary',
            )}
            style={{ backgroundColor: c }}
            aria-label={`Set color ${c}`}
          />
        ))}
      </div>
      <input
        type="text"
        value={status.name}
        onChange={(e) => onNameChange(e.target.value)}
        className="flex-1 rounded-radius-md border border-border bg-surface-container-lowest px-sm py-xs text-body focus:outline-2 focus:outline-ring"
        placeholder="Status name"
        aria-label="Status name"
      />
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-radius-sm p-xs text-muted transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`Remove status ${status.name}`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

// ─── General settings tab ─────────────────────────────────────────────────────

function GeneralTab({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const update = useUpdateProject(projectId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description ?? '');
      setColor(project.color ?? '#3B82F6');
    }
  }, [project]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    update.mutate({ name, description: description || undefined, color });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-[32rem] flex-col gap-md">
      <div className="flex flex-col gap-xs">
        <FormLabel htmlFor="settings-name">Name</FormLabel>
        <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-xs">
        <FormLabel htmlFor="settings-desc">Description</FormLabel>
        <Textarea
          id="settings-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="flex flex-col gap-xs">
        <FormLabel>Color</FormLabel>
        <div className="flex flex-wrap gap-sm" role="radiogroup" aria-label="Project color">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              onClick={() => setColor(c)}
              className={cn(
                'size-8 rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring',
                color === c && 'ring-2 ring-offset-2 ring-brand-primary',
              )}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>
      <Button type="submit" variant="primary" disabled={update.isPending} className="self-start">
        {update.isPending ? 'Saving…' : 'Save Changes'}
      </Button>
    </form>
  );
}

// ─── Workflow tab ─────────────────────────────────────────────────────────────

function WorkflowTab({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const update = useUpdateProjectStatuses(projectId);
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);

  useEffect(() => {
    if (project) setStatuses([...(project.statuses ?? [])]);
  }, [project]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setStatuses((prev) => {
      const oldIdx = prev.findIndex((s) => s.id === active.id);
      const newIdx = prev.findIndex((s) => s.id === over.id);
      return arrayMove(prev, oldIdx, newIdx).map((s, i) => ({ ...s, position: i }));
    });
  }

  function addStatus() {
    const newStatus: WorkflowStatus = {
      id: `new-${Date.now()}`,
      name: 'New Status',
      color: LABEL_COLORS[statuses.length % LABEL_COLORS.length],
      position: statuses.length,
      isDefault: false,
    };
    setStatuses((prev) => [...prev, newStatus]);
  }

  function removeStatus(id: string) {
    setStatuses((prev) => prev.filter((s) => s.id !== id));
  }

  function updateName(id: string, name: string) {
    setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }

  function updateColor(id: string, color: string) {
    setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, color } : s)));
  }

  function handleSave() {
    update.mutate(statuses);
  }

  return (
    <div className="flex max-w-[32rem] flex-col gap-md">
      <p className="text-body text-secondary">
        Drag to reorder statuses. These columns appear in the Kanban board.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-sm">
            {statuses.map((status) => (
              <SortableStatusRow
                key={status.id}
                status={status}
                onNameChange={(name) => updateName(status.id, name)}
                onColorChange={(color) => updateColor(status.id, color)}
                onRemove={() => removeStatus(status.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={addStatus}
        className="flex items-center gap-sm rounded-radius-md border border-dashed border-border px-md py-sm text-body text-muted transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Plus className="size-4" />
        Add Status
      </button>
      <Button
        variant="primary"
        onClick={handleSave}
        disabled={update.isPending}
        className="self-start"
      >
        {update.isPending ? 'Saving…' : 'Save Workflow'}
      </Button>
    </div>
  );
}

// ─── Labels tab ───────────────────────────────────────────────────────────────

function LabelsTab({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const update = useUpdateProjectLabels(projectId);
  const [labels, setLabels] = useState<Label[]>([]);

  useEffect(() => {
    if (project) setLabels([...(project.labels ?? [])]);
  }, [project]);

  function addLabel() {
    setLabels((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: 'New Label',
        color: LABEL_COLORS[prev.length % LABEL_COLORS.length],
      },
    ]);
  }

  function removeLabel(id: string) {
    setLabels((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLabelName(id: string, name: string) {
    setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
  }

  function updateLabelColor(id: string, color: string) {
    setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, color } : l)));
  }

  return (
    <div className="flex max-w-[40rem] flex-col gap-md">
      <div className="flex flex-col gap-sm">
        {labels.map((label) => (
          <div
            key={label.id}
            className="flex items-center gap-sm rounded-radius-md border border-border bg-surface-container-lowest p-sm"
          >
            <div className="flex items-center gap-xs">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateLabelColor(label.id, c)}
                  className={cn(
                    'size-5 rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring',
                    label.color === c && 'ring-2 ring-offset-1 ring-brand-primary',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Set color ${c}`}
                />
              ))}
            </div>
            <input
              type="text"
              value={label.name}
              onChange={(e) => updateLabelName(label.id, e.target.value)}
              className="min-w-0 flex-1 rounded-radius-md border border-border bg-surface-container-lowest px-sm py-xs text-body focus:outline-2 focus:outline-ring"
              aria-label="Label name"
            />
            <span
              className="inline-flex shrink-0 max-w-[8rem] items-center overflow-hidden rounded-full px-sm py-0.5 text-label font-medium"
              style={{ backgroundColor: `${label.color}22`, color: label.color }}
            >
              <span className="truncate">{label.name}</span>
            </span>
            <button
              type="button"
              onClick={() => removeLabel(label.id)}
              className="shrink-0 rounded-radius-sm p-xs text-muted transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={`Remove label ${label.name}`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addLabel}
        className="flex items-center gap-sm rounded-radius-md border border-dashed border-border px-md py-sm text-body text-muted transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Plus className="size-4" />
        Add Label
      </button>
      <Button
        variant="primary"
        onClick={() => update.mutate(labels)}
        disabled={update.isPending}
        className="self-start"
      >
        {update.isPending ? 'Saving…' : 'Save Labels'}
      </Button>
    </div>
  );
}

// ─── Members tab ──────────────────────────────────────────────────────────────

function MembersTab({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const addMember = useAddProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectMember['role']>('member');

  function handleInvite(e: FormEvent) {
    e.preventDefault();
    // In production: resolve email → userId first; for MVP we send email directly
    addMember.mutate(
      { userId: inviteEmail, role: inviteRole },
      { onSuccess: () => setInviteEmail('') },
    );
  }

  return (
    <div className="flex max-w-[32rem] flex-col gap-lg">
      {/* Current members */}
      <div className="flex flex-col gap-sm">
        {(project?.members ?? []).map((member) => (
          <div
            key={member.userId}
            className="flex items-center gap-sm rounded-radius-md border border-border bg-surface-container-lowest p-sm"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-body font-medium text-secondary">
              {member.initials}
            </span>
            <div className="flex flex-1 flex-col">
              <span className="text-body font-medium text-foreground">{member.displayName}</span>
              <span className="text-label text-muted capitalize">{member.role}</span>
            </div>
            {member.role !== 'owner' && (
              <button
                type="button"
                onClick={() => removeMember.mutate(member.userId)}
                className="shrink-0 rounded-radius-sm p-xs text-muted transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={`Remove ${member.displayName}`}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
        {!project && (
          <div className="flex flex-col gap-sm">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-radius-md" />
            ))}
          </div>
        )}
      </div>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="flex flex-col gap-sm">
        <h3 className="text-heading-3 font-semibold text-foreground">Add Member</h3>
        <div className="flex gap-sm">
          <Input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="flex-1"
            aria-label="Member email"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as ProjectMember['role'])}
            className="h-9 rounded-radius-md border border-border bg-surface-container-lowest px-sm text-body focus:outline-2 focus:outline-ring"
            aria-label="Member role"
          >
            {ROLES.filter((r) => r !== 'owner').map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
          <Button type="submit" variant="primary" disabled={addMember.isPending}>
            {addMember.isPending ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

type SettingsTab = 'general' | 'workflow' | 'labels' | 'members';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'labels', label: 'Labels' },
  { id: 'members', label: 'Members' },
];

interface ProjectSettingsPageProps {
  projectId: string;
}

export function ProjectSettingsPage({ projectId }: ProjectSettingsPageProps) {
  const { data: project } = useProject(projectId);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  useDocumentTitle(project?.name ? `${project.name} — Settings` : 'Settings');

  return (
    <div className="mx-auto max-w-screen-lg p-lg">
      {/* Back nav */}
      <button
        type="button"
        onClick={() => void navigate({ to: '/projects/$projectId', params: { projectId } })}
        className="mb-lg flex items-center gap-xs text-body text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="size-4" />
        Back to {project?.name ?? 'Project'}
      </button>

      <h1 className="mb-lg text-heading-1 font-bold text-foreground">Project Settings</h1>

      {/* Tabs */}
      <div
        className="mb-lg flex gap-xs border-b border-border"
        role="tablist"
        aria-label="Settings sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tab-panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'border-b-2 px-md pb-sm text-body font-medium transition-colors',
              activeTab === tab.id
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div id={`tab-panel-${activeTab}`} role="tabpanel" aria-labelledby={activeTab}>
        {activeTab === 'general' && <GeneralTab projectId={projectId} />}
        {activeTab === 'workflow' && <WorkflowTab projectId={projectId} />}
        {activeTab === 'labels' && <LabelsTab projectId={projectId} />}
        {activeTab === 'members' && <MembersTab projectId={projectId} />}
      </div>
    </div>
  );
}
