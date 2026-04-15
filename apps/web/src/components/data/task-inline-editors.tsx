import { useOrgMembers } from '@/api/organizations';
import type { ProjectMember, WorkflowStatus } from '@/api/projects';
import {
  type Priority,
  type TaskWithRelations,
  getBlockedStatusTransitionMessage,
  isStatusTransitionBlocked,
  useUpdateTask,
} from '@/api/tasks';
import { PriorityBadge } from '@/components/priority-badge';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { X } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

const MEMBERS_READ_PERMISSION = 'membership.read.org';

// ─── Shared popover shell ─────────────────────────────────────────────────────

export function PickerPopover({
  open,
  onClose,
  trigger,
  children,
  className,
  align = 'start',
}: {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const VIEWPORT_MARGIN = 8;
  const OFFSET_Y = 4;

  // Capture trigger position when opening
  useEffect(() => {
    if (open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
      setPosition(null);
    }
  }, [open]);

  // Keep anchor rect fresh while open (resize/scroll)
  useEffect(() => {
    if (!open) return;
    function refreshAnchorRect() {
      if (triggerRef.current) {
        setRect(triggerRef.current.getBoundingClientRect());
      }
    }
    window.addEventListener('resize', refreshAnchorRect);
    window.addEventListener('scroll', refreshAnchorRect, true);
    return () => {
      window.removeEventListener('resize', refreshAnchorRect);
      window.removeEventListener('scroll', refreshAnchorRect, true);
    };
  }, [open]);

  // Resolve final popover position with viewport collision handling
  useEffect(() => {
    if (!open || !rect || !contentRef.current) return;

    const content = contentRef.current;
    const contentWidth = content.offsetWidth;
    const contentHeight = content.offsetHeight;

    let left = align === 'end' ? rect.right - contentWidth : rect.left;
    const minLeft = VIEWPORT_MARGIN;
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - contentWidth - VIEWPORT_MARGIN);
    left = Math.min(Math.max(left, minLeft), maxLeft);

    let top = rect.bottom + OFFSET_Y;
    const maxBottomTop = window.innerHeight - contentHeight - VIEWPORT_MARGIN;
    if (top > maxBottomTop) {
      const openUpTop = rect.top - contentHeight - OFFSET_Y;
      if (openUpTop >= VIEWPORT_MARGIN) {
        top = openUpTop;
      } else {
        top = Math.max(VIEWPORT_MARGIN, maxBottomTop);
      }
    }

    setPosition((prev) => {
      if (prev && prev.left === left && prev.top === top) return prev;
      return { top, left };
    });
  }, [open, rect, align]);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        contentRef.current?.contains(e.target as Node)
      )
        return;
      onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={triggerRef} className="inline-block">
      {trigger}
      {open &&
        rect &&
        createPortal(
          <div
            ref={contentRef}
            style={{
              position: 'fixed',
              top: position?.top ?? rect.bottom + OFFSET_Y,
              left: position?.left ?? rect.left,
              zIndex: 9999,
            }}
            className={cn(
              'rounded-radius-lg border border-border bg-surface-container-lowest shadow-2',
              className,
            )}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}

// ─── Status Picker ────────────────────────────────────────────────────────────

export function StatusPicker({
  taskId,
  task,
  statusId,
  statuses,
  children,
}: {
  taskId: string;
  task: TaskWithRelations;
  statusId: string;
  statuses: WorkflowStatus[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateTask(taskId);
  const close = useCallback(() => setOpen(false), []);
  const blockedByStatusId = useMemo(() => {
    return new Map(
      statuses.map((status) => [status.id, isStatusTransitionBlocked(task, status)] as const),
    );
  }, [statuses, task]);

  return (
    <PickerPopover
      open={open}
      onClose={close}
      className="min-w-40 p-xs"
      trigger={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Change status"
        >
          {children}
        </button>
      }
    >
      {statuses.map((s) => {
        const eligibility = blockedByStatusId.get(s.id);
        const isBlocked = s.id !== statusId && Boolean(eligibility?.blocked);
        return (
          <button
            key={s.id}
            type="button"
            aria-disabled={isBlocked}
            className={cn(
              'flex w-full items-center gap-sm rounded-radius-md px-sm py-xs text-body transition-colors hover:bg-surface-container-low',
              s.id === statusId && 'bg-surface-container-low',
              isBlocked &&
                'cursor-not-allowed text-muted opacity-65 hover:bg-transparent hover:text-muted',
            )}
            onClick={() => {
              if (isBlocked && eligibility) {
                toast.info(getBlockedStatusTransitionMessage(s.name, eligibility));
                return;
              }
              update.mutate({ statusId: s.id });
              close();
            }}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </button>
        );
      })}
    </PickerPopover>
  );
}

// ─── Priority Picker ──────────────────────────────────────────────────────────

const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low', 'none'];

export function PriorityPicker({
  taskId,
  priority,
  children,
}: {
  taskId: string;
  priority: Priority;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateTask(taskId);
  const close = useCallback(() => setOpen(false), []);

  return (
    <PickerPopover
      open={open}
      onClose={close}
      className="min-w-36 p-xs"
      trigger={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Change priority"
        >
          {children}
        </button>
      }
    >
      {PRIORITIES.map((p) => (
        <button
          key={p}
          type="button"
          className={cn(
            'flex w-full items-center rounded-radius-md px-sm py-xs text-body transition-colors hover:bg-surface-container-low',
            p === priority && 'bg-surface-container-low',
          )}
          onClick={() => {
            update.mutate({ priority: p });
            close();
          }}
        >
          <PriorityBadge priority={p} showDot showLabel />
        </button>
      ))}
    </PickerPopover>
  );
}

// ─── Label Picker ─────────────────────────────────────────────────────────────

export function LabelPicker({
  taskId,
  selectedLabels,
  allLabels,
  children,
}: {
  taskId: string;
  selectedLabels: Array<{ id: string; name: string; color: string | null }>;
  allLabels: Array<{ id: string; name: string; color: string | null }>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateTask(taskId);
  const close = useCallback(() => setOpen(false), []);

  const selectedIds = new Set(selectedLabels.map((l) => l.id));

  function toggle(labelId: string) {
    const next = selectedIds.has(labelId)
      ? [...selectedIds].filter((id) => id !== labelId)
      : [...selectedIds, labelId];
    update.mutate({ labelIds: next });
  }

  if (allLabels.length === 0) return <>{children}</>;

  return (
    <PickerPopover
      open={open}
      onClose={close}
      className="min-w-40 p-xs"
      trigger={
        <button
          type="button"
          className="text-left"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Edit labels"
        >
          {children}
        </button>
      }
    >
      {allLabels.map((l) => (
        <button
          key={l.id}
          type="button"
          className={cn(
            'flex w-full items-center gap-sm rounded-radius-md px-sm py-xs text-body transition-colors hover:bg-surface-container-low',
            selectedIds.has(l.id) && 'bg-surface-container-low',
          )}
          onClick={() => toggle(l.id)}
        >
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: l.color ?? undefined }}
          />
          <span className="line-clamp-1 flex-1 text-left">{l.name}</span>
          {selectedIds.has(l.id) && <X className="size-3 shrink-0 text-muted" />}
        </button>
      ))}
    </PickerPopover>
  );
}

// ─── Due Date Picker ──────────────────────────────────────────────────────────

export function DueDatePicker({
  taskId,
  dueDate,
  children,
}: {
  taskId: string;
  dueDate?: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateTask(taskId);
  const close = useCallback(() => setOpen(false), []);

  const inputValue = dueDate ? new Date(dueDate).toISOString().split('T')[0] : '';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    update.mutate(
      { dueDate: value ? new Date(value).toISOString() : null },
      {
        onSettled: close,
      },
    );
  }

  return (
    <PickerPopover
      open={open}
      onClose={close}
      className="p-sm"
      trigger={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Change due date"
        >
          {children}
        </button>
      }
    >
      <div className="flex flex-col gap-xs">
        <input
          type="date"
          defaultValue={inputValue}
          onChange={handleChange}
          className="h-8 w-auto rounded-radius-md border border-border bg-surface-container-high px-sm text-body text-foreground focus:outline-2 focus:outline-ring dark:[&::-webkit-calendar-picker-indicator]:invert"
        />
        {dueDate && (
          <button
            type="button"
            className="text-left text-label text-muted hover:text-danger"
            onClick={() =>
              update.mutate(
                { dueDate: null },
                {
                  onSettled: close,
                },
              )
            }
          >
            Clear due date
          </button>
        )}
      </div>
    </PickerPopover>
  );
}

// ─── Assignee Picker ──────────────────────────────────────────────────────────

export function AssigneePicker({
  taskId,
  assigneeId,
  members,
  children,
}: {
  taskId: string;
  assigneeId?: string | null;
  members: ProjectMember[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const update = useUpdateTask(taskId);
  const close = useCallback(() => {
    setOpen(false);
    setSearch('');
  }, []);

  const userPermissions = useAuthStore((s) => s.user?.permissions ?? []);
  const permissionSet = useMemo(() => new Set(userPermissions), [userPermissions]);
  const canViewOrgMembers = permissionSet.has(MEMBERS_READ_PERMISSION);
  const orgId = useAuthStore((s) => s.activeOrganizationId ?? s.user?.organizationId);
  const { data: orgMembers } = useOrgMembers(canViewOrgMembers ? orgId : undefined);
  const searchSource = canViewOrgMembers ? (orgMembers ?? members) : members;

  const filtered = searchSource
    .filter((m) => {
      const q = search.toLowerCase();
      const byName = m.displayName.toLowerCase().includes(q);
      const byEmail =
        'email' in m && typeof m.email === 'string' && m.email.toLowerCase().includes(q);
      return byName || byEmail;
    })
    .slice(0, 5);

  function assign(userId: string | null) {
    update.mutate(
      { assigneeId: userId },
      {
        onSettled: close,
      },
    );
  }

  return (
    <PickerPopover
      open={open}
      onClose={close}
      className="w-52 p-xs"
      trigger={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Change assignee"
        >
          {children}
        </button>
      }
    >
      <div className="pb-xs">
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 w-full rounded-radius-md border border-border bg-surface-container-high px-sm text-body text-foreground placeholder:text-muted focus:outline-2 focus:outline-ring"
          onClick={(e) => e.stopPropagation()}
        />
        {!canViewOrgMembers ? (
          <p className="pt-xs text-label text-muted">
            Showing project members only (membership.read.org required for organization directory).
          </p>
        ) : null}
      </div>
      {filtered.length > 0 ? (
        filtered.map((m) => (
          <button
            key={m.userId}
            type="button"
            className={cn(
              'flex w-full items-center gap-sm rounded-radius-md px-sm py-xs text-body transition-colors hover:bg-surface-container-low',
              m.userId === assigneeId && 'bg-surface-container-low',
            )}
            onClick={() => assign(m.userId)}
          >
            <Avatar name={m.displayName} userId={m.userId} size="sm" />
            <span className="line-clamp-1 text-left">{m.displayName}</span>
          </button>
        ))
      ) : (
        <p className="px-sm py-xs text-label text-muted">No members found</p>
      )}
      {assigneeId && (
        <>
          <div className="-mx-xs my-xs h-px bg-border" />
          <button
            type="button"
            className="flex w-full items-center gap-sm rounded-radius-md px-sm py-xs text-body text-muted transition-colors hover:bg-surface-container-low hover:text-foreground"
            onClick={() => assign(null)}
          >
            <div className="size-6 rounded-full border-2 border-dashed border-border" />
            <span>Remove assignee</span>
          </button>
        </>
      )}
    </PickerPopover>
  );
}
