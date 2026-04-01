import type { WorkflowStatus } from '@/api/projects';
import type { Priority } from '@/api/tasks';
import { PriorityPicker } from '@/components/data/task-inline-editors';
import { PriorityBadge } from '@/components/priority-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CalendarDays, ChevronDown, Maximize2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface TaskHeaderProps {
  variant?: 'panel' | 'page';
  taskId: string;
  title: string;
  statusId: string;
  priority?: Priority;
  statuses: WorkflowStatus[];
  projectName?: string;
  createdAt?: string;
  showOpenFullPage?: boolean;
  showCloseButton?: boolean;
  onTitleSave: (title: string) => void;
  onStatusChange: (statusId: string) => void;
  onOpenFullPage?: () => void;
  onClose?: () => void;
}

function formatTaskId(taskId: string) {
  return `TASK-${taskId.slice(0, 8).toUpperCase()}`;
}

function formatCreatedDate(createdAt?: string) {
  if (!createdAt) return 'Created recently';
  const date = new Date(createdAt);
  return `Created ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

export function TaskHeader({
  variant = 'panel',
  taskId,
  title,
  statusId,
  priority = 'none',
  statuses,
  projectName,
  createdAt,
  showOpenFullPage,
  showCloseButton,
  onTitleSave,
  onStatusChange,
  onOpenFullPage,
  onClose,
}: TaskHeaderProps) {
  const isPage = variant === 'page';
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
    }
  }, [isEditingTitle]);

  const status = statuses.find((item) => item.id === statusId);

  function submitTitle() {
    const normalized = draftTitle.trim();
    if (!normalized || normalized === title) {
      setDraftTitle(title);
      setIsEditingTitle(false);
      return;
    }

    onTitleSave(normalized);
    setIsEditingTitle(false);
  }

  return (
    <header className="relative z-20 border-b border-border/20 bg-surface-container-lowest/92 backdrop-blur-md">
      <div className="flex items-start justify-between gap-md px-xl py-lg">
        <div className="min-w-0 flex-1">
          <p className="text-label font-bold uppercase tracking-widest text-brand-primary">
            {formatTaskId(taskId)}
          </p>

          {isEditingTitle ? (
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onBlur={submitTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submitTitle();
                }
                if (event.key === 'Escape') {
                  setDraftTitle(title);
                  setIsEditingTitle(false);
                }
              }}
              className={
                isPage
                  ? 'mt-xs w-full rounded-radius-md border border-border bg-surface-container-low px-sm py-xs text-4xl font-extrabold tracking-tight text-foreground'
                  : 'mt-xs w-full rounded-radius-md border border-border bg-surface-container-low px-sm py-xs text-heading-2 font-bold text-foreground'
              }
              aria-label="Task title"
              ref={titleInputRef}
            />
          ) : (
            <button
              type="button"
              className={
                isPage
                  ? 'mt-xs w-full rounded-radius-md px-xs py-xs text-left text-4xl font-extrabold tracking-tight text-foreground hover:bg-surface-container-low'
                  : 'mt-xs w-full rounded-radius-md px-xs py-xs text-left text-heading-2 font-bold text-foreground hover:bg-surface-container-low'
              }
              onClick={() => setIsEditingTitle(true)}
            >
              {title}
            </button>
          )}

          <div className="mt-sm flex flex-wrap items-center gap-md text-label font-medium text-secondary">
            <span className="truncate">{projectName ?? 'Project'}</span>
            <span className="inline-flex items-center gap-xs">
              <CalendarDays className="size-3.5" />
              {formatCreatedDate(createdAt)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-sm">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'inline-flex h-9 items-center gap-xs rounded-radius-md border border-border/60 bg-surface-container-lowest px-sm text-small font-semibold tracking-wide text-foreground shadow-inner',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              )}
              aria-label="Task status"
            >
              {status ? (
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: status.color }}
                  aria-hidden
                />
              ) : null}
              <span>{status?.name ?? 'Status'}</span>
              <ChevronDown className="size-4 text-muted" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="left-0 right-auto min-w-[10rem]">
              {statuses.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className={cn(item.id === statusId && 'bg-surface-container-low')}
                  onClick={() => onStatusChange(item.id)}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  <span>{item.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isPage ? (
            <PriorityPicker taskId={taskId} priority={priority}>
              <div className="hidden h-9 cursor-pointer items-center gap-xs rounded-radius-md border border-border/60 bg-transparent px-sm transition-colors hover:bg-surface-container-lowest/80 md:inline-flex">
                <PriorityBadge priority={priority} showDot showLabel appearance="plain" />
                <ChevronDown className="size-3.5 text-muted" />
              </div>
            </PriorityPicker>
          ) : null}

          {showOpenFullPage ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open in full page"
              onClick={onOpenFullPage}
            >
              <Maximize2 className="size-4" />
            </Button>
          ) : null}

          {showCloseButton ? (
            <Button variant="ghost" size="icon" aria-label="Close panel" onClick={onClose}>
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
