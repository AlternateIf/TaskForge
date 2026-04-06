import { useOrgMembers } from '@/api/organizations';
import {
  type Label,
  type ProjectMember,
  type WorkflowStatus,
  useAddProjectMember,
  useDeleteProject,
  useProject,
  useRemoveProjectMember,
  useUpdateProject,
  useUpdateProjectLabels,
  useUpdateProjectStatuses,
} from '@/api/projects';
import { PickerPopover } from '@/components/data/task-inline-editors';
import { RichTextEditor } from '@/components/editor';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Label as FormLabel } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
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
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// ─── Color picker popover (swatch trigger + picker dropdown) ─────────────────

function ColorPickerPopover({
  color,
  onChange,
}: {
  color: string;
  onChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <PickerPopover
      open={open}
      onClose={close}
      className="p-sm"
      trigger={
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className="size-6 shrink-0 rounded-full border-2 border-white shadow-sm ring-1 ring-border transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ring"
          style={{ backgroundColor: color }}
          aria-label="Change color"
        />
      }
    >
      <ColorPicker value={color} onChange={onChange} className="w-52" />
    </PickerPopover>
  );
}

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
      <ColorPickerPopover color={status.color} onChange={onColorChange} />
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

// ─── Member combobox ──────────────────────────────────────────────────────────

function MemberCombobox({
  projectMembers,
  onAdd,
  isPending,
}: {
  projectMembers: ProjectMember[];
  onAdd: (userId: string) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const orgId = useAuthStore((s) => s.activeOrganizationId ?? s.user?.organizationId ?? undefined);
  const { data: orgMembers = [] } = useOrgMembers(orgId);
  const close = useCallback(() => {
    setOpen(false);
    setSearch('');
  }, []);

  const existingIds = new Set(projectMembers.map((m) => m.userId));
  const filtered = orgMembers
    .filter((m) => !existingIds.has(m.userId))
    .filter((m) => {
      const q = search.toLowerCase();
      return m.displayName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    })
    .slice(0, 8);

  return (
    <PickerPopover
      open={open}
      onClose={close}
      className="w-64 p-xs"
      trigger={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Plus className="size-4" />
          Add Member
        </Button>
      }
    >
      <div className="pb-xs">
        <input
          type="text"
          placeholder="Search members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          // biome-ignore lint/a11y/noAutofocus: intentional for popover UX
          autoFocus
          className="h-7 w-full rounded-radius-md border border-border bg-surface-container-high px-sm text-body text-foreground placeholder:text-muted focus:outline-2 focus:outline-ring"
        />
      </div>
      {filtered.length > 0 ? (
        filtered.map((m) => (
          <button
            key={m.userId}
            type="button"
            disabled={isPending}
            className="flex w-full items-center gap-sm rounded-radius-md px-sm py-xs text-body transition-colors hover:bg-surface-container-low disabled:opacity-50"
            onClick={() => {
              onAdd(m.userId);
              close();
            }}
          >
            <Avatar name={m.displayName} userId={m.userId} size="sm" />
            <div className="flex min-w-0 flex-1 flex-col text-left">
              <span className="line-clamp-1 font-medium text-foreground">{m.displayName}</span>
              <span className="truncate text-label text-muted">{m.email}</span>
            </div>
          </button>
        ))
      ) : (
        <p className="px-sm py-xs text-label text-muted">
          {orgMembers.length === 0 ? 'Loading…' : 'No members to add'}
        </p>
      )}
    </PickerPopover>
  );
}

// ─── General settings tab ─────────────────────────────────────────────────────

function GeneralTab({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { data: project } = useProject(projectId);
  const update = useUpdateProject(projectId);
  const deleteProject = useDeleteProject(projectId);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle');
  const [deleteInput, setDeleteInput] = useState('');

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

  function handleDelete() {
    deleteProject.mutate(undefined, {
      onSuccess: () => {
        void navigate({ to: '/dashboard' });
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete project');
      },
    });
  }

  const inputClass =
    'h-9 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md text-body text-foreground placeholder:text-muted focus:outline-2 focus:outline-ring disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <form onSubmit={canEdit ? handleSubmit : (e) => e.preventDefault()}>
      <div className="grid grid-cols-1 gap-xl xl:grid-cols-[1fr_320px]">
        {/* Left column — project info */}
        <div className="rounded-radius-xl border border-border bg-surface-container-lowest p-xl">
          <h2 className="mb-lg text-heading-3 font-semibold text-foreground">Project Info</h2>
          <div className="flex flex-col gap-md">
            <div className="flex flex-col gap-xs">
              <FormLabel htmlFor="settings-name">Name</FormLabel>
              <input
                id="settings-name"
                type="text"
                value={name}
                onChange={canEdit ? (e) => setName(e.target.value) : undefined}
                readOnly={!canEdit}
                required={canEdit}
                className={cn(inputClass, !canEdit && 'cursor-default select-text')}
              />
            </div>
            <div className="flex flex-col gap-xs">
              <FormLabel>Description</FormLabel>
              {project ? (
                <RichTextEditor
                  key={project.id}
                  mode="description"
                  content={project.description ?? ''}
                  onUpdate={canEdit ? (html) => setDescription(html) : undefined}
                  editable={canEdit}
                  className="border-border bg-surface-container-lowest"
                />
              ) : (
                <Skeleton className="h-32 rounded-radius-lg" />
              )}
            </div>
            {canEdit && (
              <Button
                type="submit"
                variant="primary"
                disabled={update.isPending}
                className="self-start"
              >
                {update.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>

        {/* Right column — color + danger zone */}
        <div className="flex flex-col gap-lg">
          <div className="rounded-radius-xl border border-border bg-surface-container-lowest p-xl">
            <h2 className="mb-lg text-heading-3 font-semibold text-foreground">Project Color</h2>
            {canEdit ? (
              <ColorPicker value={color} onChange={setColor} />
            ) : (
              <div className="flex items-center gap-sm">
                <div
                  className="size-10 shrink-0 rounded-radius-md border border-border"
                  style={{ backgroundColor: color }}
                />
                <span className="font-mono text-label text-muted">{color.toUpperCase()}</span>
              </div>
            )}
          </div>

          {canEdit && (
            <div className="rounded-radius-xl border border-danger/30 bg-danger/5 p-xl">
              <h2 className="mb-xs text-heading-3 font-semibold text-danger">Danger Zone</h2>
              <p className="mb-lg text-body text-secondary">
                Deleting a project is permanent and cannot be undone. All tasks, statuses, and
                labels will be lost.
              </p>
              {deleteStep === 'idle' ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteStep('confirm')}
                >
                  Delete Project
                </Button>
              ) : (
                <div className="flex flex-col gap-sm">
                  <p className="text-label text-secondary">
                    Type <span className="font-mono font-bold text-foreground">delete</span> to
                    confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="delete"
                    // biome-ignore lint/a11y/noAutofocus: intentional confirm UX
                    autoFocus
                    className="h-9 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md text-body text-foreground placeholder:text-muted focus:outline-2 focus:outline-ring"
                  />
                  <div className="flex gap-sm">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={deleteInput !== 'delete' || deleteProject.isPending}
                      onClick={handleDelete}
                    >
                      {deleteProject.isPending ? 'Deleting…' : 'Yes, delete'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteStep('idle');
                        setDeleteInput('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

// ─── Workflow tab ─────────────────────────────────────────────────────────────

function WorkflowTab({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { data: project } = useProject(projectId);
  const update = useUpdateProjectStatuses(projectId);
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);

  useEffect(() => {
    if (project) setStatuses([...(project.statuses ?? [])]);
  }, [project]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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
    setStatuses((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: 'New Status',
        color: '#3B82F6',
        position: prev.length,
        isDefault: false,
      },
    ]);
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

  return (
    <div className="flex flex-col gap-lg">
      <div className="rounded-radius-xl border border-border bg-surface-container-lowest p-xl">
        <h2 className="mb-xs text-heading-3 font-semibold text-foreground">Workflow Statuses</h2>
        <p className="mb-lg text-body text-secondary">
          {canEdit
            ? 'Drag to reorder statuses. These columns appear in the Kanban board.'
            : 'These columns appear in the Kanban board.'}
        </p>
        {canEdit ? (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={statuses.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
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
              className="mt-sm flex w-full items-center gap-sm rounded-radius-md border border-dashed border-border px-md py-sm text-body text-muted transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Plus className="size-4" />
              Add Status
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-sm">
            {statuses.map((status) => (
              <div
                key={status.id}
                className="flex items-center gap-sm rounded-radius-md border border-border bg-surface-container-lowest p-sm"
              >
                <div
                  className="size-6 shrink-0 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span className="flex-1 text-body text-foreground">{status.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {canEdit && (
        <Button
          variant="primary"
          onClick={() => update.mutate(statuses)}
          disabled={update.isPending}
          className="self-start"
        >
          {update.isPending ? 'Saving…' : 'Save Workflow'}
        </Button>
      )}
    </div>
  );
}

// ─── Labels tab ───────────────────────────────────────────────────────────────

function LabelsTab({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { data: project } = useProject(projectId);
  const update = useUpdateProjectLabels(projectId);
  const [labels, setLabels] = useState<Label[]>([]);

  useEffect(() => {
    if (project) setLabels([...(project.labels ?? [])]);
  }, [project]);

  function addLabel() {
    setLabels((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: 'New Label', color: '#3B82F6' },
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
    <div className="flex flex-col gap-lg">
      <div className="rounded-radius-xl border border-border bg-surface-container-lowest p-xl">
        <h2 className="mb-lg text-heading-3 font-semibold text-foreground">Labels</h2>
        <div className="flex flex-col gap-sm">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-sm rounded-radius-md border border-border bg-surface-container-lowest p-sm"
            >
              {canEdit ? (
                <ColorPickerPopover
                  color={label.color}
                  onChange={(c) => updateLabelColor(label.id, c)}
                />
              ) : (
                <div
                  className="size-6 shrink-0 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
              )}
              <input
                type="text"
                value={label.name}
                onChange={canEdit ? (e) => updateLabelName(label.id, e.target.value) : undefined}
                readOnly={!canEdit}
                className={cn(
                  'min-w-0 flex-1 rounded-radius-md border border-border bg-surface-container-lowest px-sm py-xs text-body focus:outline-2 focus:outline-ring',
                  !canEdit && 'cursor-default select-text',
                )}
                aria-label="Label name"
              />
              <span
                className="inline-flex max-w-[8rem] shrink-0 items-center overflow-hidden rounded-full px-sm py-0.5 text-label font-medium"
                style={{ backgroundColor: `${label.color}22`, color: label.color }}
              >
                <span className="truncate">{label.name}</span>
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removeLabel(label.id)}
                  className="shrink-0 rounded-radius-sm p-xs text-muted transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label={`Remove label ${label.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={addLabel}
            className="mt-sm flex w-full items-center gap-sm rounded-radius-md border border-dashed border-border px-md py-sm text-body text-muted transition-colors hover:border-brand-primary hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Plus className="size-4" />
            Add Label
          </button>
        )}
      </div>
      {canEdit && (
        <Button
          variant="primary"
          onClick={() => update.mutate(labels)}
          disabled={update.isPending}
          className="self-start"
        >
          {update.isPending ? 'Saving…' : 'Save Labels'}
        </Button>
      )}
    </div>
  );
}

// ─── Members tab ──────────────────────────────────────────────────────────────

function MembersTab({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const addMember = useAddProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);
  const orgId = useAuthStore((s) => s.activeOrganizationId ?? s.user?.organizationId ?? undefined);
  const { data: orgMembers = [] } = useOrgMembers(orgId);

  const orgMemberMap = new Map(orgMembers.map((m) => [m.userId, m]));
  const members = project?.members ?? [];

  return (
    <div className="flex flex-col gap-lg">
      <div className="overflow-hidden rounded-radius-xl border border-border bg-surface-container-lowest">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-xl py-lg">
          <div>
            <h2 className="text-heading-3 font-semibold text-foreground">Members</h2>
            <p className="text-label text-muted">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
          <MemberCombobox
            projectMembers={members}
            onAdd={(userId) =>
              addMember.mutate(
                { userId },
                {
                  onError: (error) => {
                    toast.error(error.message || 'Failed to add member');
                  },
                },
              )
            }
            isPending={addMember.isPending}
          />
        </div>

        {/* Members table */}
        {!project ? (
          <div className="flex flex-col gap-sm p-xl">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-radius-md" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="p-xl text-body text-muted">No members yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-container-low">
                <th className="px-xl py-sm text-left text-label font-medium text-muted">Member</th>
                <th className="hidden px-lg py-sm text-left text-label font-medium text-muted md:table-cell">
                  Email
                </th>
                <th className="hidden px-lg py-sm text-left text-label font-medium text-muted lg:table-cell">
                  Org Role
                </th>
                <th className="hidden px-lg py-sm text-right text-label font-medium text-muted sm:table-cell">
                  Tasks
                </th>
                <th className="w-10 px-lg py-sm" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => {
                const orgMember = orgMemberMap.get(member.userId);
                return (
                  <tr
                    key={member.userId}
                    className="transition-colors hover:bg-surface-container-low"
                  >
                    <td className="px-xl py-sm">
                      <div className="flex items-center gap-sm">
                        <Avatar
                          src={member.avatarUrl}
                          name={member.displayName}
                          userId={member.userId}
                          size="md"
                        />
                        <div className="flex flex-col">
                          <span className="text-body font-medium text-foreground">
                            {member.displayName}
                          </span>
                          <span className="text-label capitalize text-muted">{member.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-lg py-sm text-body text-secondary md:table-cell">
                      {orgMember?.email ?? '—'}
                    </td>
                    <td className="hidden px-lg py-sm lg:table-cell">
                      {orgMember ? (
                        <span className="inline-flex items-center rounded-full bg-surface-container px-sm py-0.5 text-label font-medium text-secondary">
                          {orgMember.roleName}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="hidden px-lg py-sm text-right text-body text-secondary sm:table-cell">
                      {member.taskCount ?? '—'}
                    </td>
                    <td className="px-lg py-sm text-right">
                      {member.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() =>
                            removeMember.mutate(member.userId, {
                              onError: (error) => {
                                toast.error(error.message || 'Failed to remove member');
                              },
                            })
                          }
                          className="rounded-radius-sm p-xs text-muted transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
                          aria-label={`Remove ${member.displayName}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

type SettingsTab = 'general' | 'workflow' | 'labels' | 'members';

const ALL_TABS: { id: SettingsTab; label: string; requiresEdit?: boolean }[] = [
  { id: 'general', label: 'General' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'labels', label: 'Labels' },
  { id: 'members', label: 'Members', requiresEdit: true },
];

interface ProjectSettingsPageProps {
  projectId: string;
}

export function ProjectSettingsPage({ projectId }: ProjectSettingsPageProps) {
  const { data: project } = useProject(projectId);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canEdit = useMemo(
    () => new Set(user?.permissions ?? []).has('project.update.org'),
    [user?.permissions],
  );
  const tabs = useMemo(() => ALL_TABS.filter((t) => !t.requiresEdit || canEdit), [canEdit]);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  useDocumentTitle(project?.name ? `${project.name} — Settings` : 'Settings');

  return (
    <div className="p-lg">
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
        {tabs.map((tab) => (
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
        {activeTab === 'general' && <GeneralTab projectId={projectId} canEdit={canEdit} />}
        {activeTab === 'workflow' && <WorkflowTab projectId={projectId} canEdit={canEdit} />}
        {activeTab === 'labels' && <LabelsTab projectId={projectId} canEdit={canEdit} />}
        {activeTab === 'members' && <MembersTab projectId={projectId} />}
      </div>
    </div>
  );
}
