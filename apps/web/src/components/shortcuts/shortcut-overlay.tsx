import { cn } from '@/lib/utils';
import {
  SHORTCUT_DEFINITIONS,
  type ShortcutDefinition,
  type ShortcutScope,
} from '@taskforge/shared';
import { CircleHelp, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

interface ShortcutOverlayProps {
  open: boolean;
  activeScope: ShortcutScope;
  onOpenChange: (open: boolean) => void;
}

const KEYCAP_CLASS =
  'rounded-[6px] border border-outline-variant bg-surface-container-high px-1.5 py-0.5 font-mono text-label text-foreground';

const SECTION_ACTIVE_SCOPES: Record<
  'global' | 'board-list' | 'task-detail' | 'overlay',
  readonly ShortcutScope[]
> = {
  global: ['global'],
  'board-list': ['board', 'list'],
  'task-detail': ['task-detail'],
  overlay: ['overlay'],
};

function getDisplayKeys(shortcut: ShortcutDefinition): string[] {
  if (shortcut.kind === 'chord') {
    return shortcut.displayKeys.length > 0
      ? [...shortcut.displayKeys]
      : [shortcut.chord[0], shortcut.chord[1]];
  }
  return shortcut.displayKeys.length > 0 ? [...shortcut.displayKeys] : [shortcut.key];
}

function toPrototypeKeyLabel(key: string): string {
  return /^[a-z]$/i.test(key) ? key.toLowerCase() : key;
}

function getScopeLabel(scope: ShortcutScope): string {
  if (scope === 'list') {
    return 'List';
  }

  if (scope === 'board') {
    return 'Board/List';
  }

  if (scope === 'task-detail') {
    return 'Task detail';
  }

  return scope.charAt(0).toUpperCase() + scope.slice(1);
}

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return [
    ...container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true');
}

export function ShortcutOverlay({ open, activeScope, onOpenChange }: ShortcutOverlayProps) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const grouped = useMemo(() => {
    const base = {
      global: [] as ShortcutDefinition[],
      board: [] as ShortcutDefinition[],
      list: [] as ShortcutDefinition[],
      'task-detail': [] as ShortcutDefinition[],
      overlay: [] as ShortcutDefinition[],
    };

    for (const definition of SHORTCUT_DEFINITIONS) {
      base[definition.scope].push(definition);
    }

    return base;
  }, []);

  const boardListShortcuts = useMemo(
    () => ({
      newTask: grouped.board.find((shortcut) => shortcut.kind === 'single' && shortcut.key === 'n'),
      navigateDown: grouped.board.find(
        (shortcut) => shortcut.kind === 'single' && shortcut.key === 'j',
      ),
      navigateUp: grouped.board.find(
        (shortcut) => shortcut.kind === 'single' && shortcut.key === 'k',
      ),
      openFocusedTask: grouped.board.find(
        (shortcut) => shortcut.kind === 'single' && shortcut.key === 'enter',
      ),
    }),
    [grouped.board],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      const first = getFocusableElements(dialogRef.current)[0];
      first?.focus();
    }, 0);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Open keyboard shortcuts"
        onClick={() => onOpenChange(true)}
        className="fixed bottom-lg right-lg z-40 inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface-container-low text-foreground shadow-3 transition-colors hover:bg-surface-container"
      >
        <CircleHelp className="size-5" />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="fixed inset-0 z-50 bg-foreground/45"
        onClick={() => onOpenChange(false)}
      />
      <dialog
        open
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby="shortcut-overlay-title"
        aria-describedby="shortcut-overlay-description"
        className="fixed left-1/2 top-1/2 z-60 flex w-[min(760px,calc(100vw-1rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-radius-xl border border-border bg-surface-container-lowest p-md shadow-4"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') {
            return;
          }

          const focusables = getFocusableElements(dialogRef.current);
          if (focusables.length === 0) {
            event.preventDefault();
            return;
          }

          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const active = document.activeElement as HTMLElement | null;

          if (event.shiftKey && active === first) {
            event.preventDefault();
            last?.focus();
          }

          if (!event.shiftKey && active === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="flex items-start justify-between gap-sm">
          <div>
            <p className="text-label font-bold uppercase tracking-widest text-secondary">
              Keyboard shortcuts
            </p>
            <h2
              id="shortcut-overlay-title"
              className="text-heading-3 font-semibold text-foreground"
            >
              Compact modal cheat sheet
            </h2>
            <p id="shortcut-overlay-description" className="mt-xs text-small text-secondary">
              Keyboard shortcut reference overlay
            </p>
            <p className="mt-xs text-small text-secondary">
              <span>Active scope:</span> <span>{getScopeLabel(activeScope)}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close shortcuts overlay"
            className="inline-flex size-9 items-center justify-center rounded-radius-md border border-border bg-surface-container-low text-foreground transition-colors hover:bg-surface-container"
          >
            <X className="size-4" />
          </button>
        </div>

        <fieldset
          className="mt-md grid gap-sm border-0 p-0 md:grid-cols-2"
          aria-label="Shortcut groups"
        >
          <section
            className={cn(
              'rounded-radius-lg border border-outline-variant bg-surface-container-low p-sm',
              SECTION_ACTIVE_SCOPES.global.includes(activeScope) && 'border-brand-primary/60',
            )}
            aria-label="Global shortcuts"
          >
            <h3 className="text-label font-bold uppercase tracking-widest text-secondary">
              Global (work anywhere)
            </h3>
            <ul className="mt-xs space-y-1">
              {grouped.global.map((shortcut) => (
                <li
                  key={shortcut.id}
                  className="flex items-center justify-between gap-sm text-small"
                >
                  <span className="text-secondary">
                    {shortcut.id === 'global.show-shortcuts-overlay' &&
                      'Show shortcut reference overlay'}
                    {shortcut.id === 'global.focus-command-palette-search' &&
                      'Open search (command palette)'}
                    {shortcut.id === 'global.go-dashboard' && 'Go to dashboard'}
                    {shortcut.id === 'global.go-projects' && 'Go to projects list'}
                    {shortcut.id === 'global.new-project' && 'New project'}
                    {shortcut.id === 'global.escape' && 'Close modal/panel/overlay'}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1">
                    {getDisplayKeys(shortcut).map((part) => (
                      <kbd key={`${shortcut.id}-${part}`} className={KEYCAP_CLASS}>
                        {toPrototypeKeyLabel(part)}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section
            className={cn(
              'rounded-radius-lg border border-outline-variant bg-surface-container-low p-sm',
              SECTION_ACTIVE_SCOPES['board-list'].includes(activeScope) &&
                'border-brand-primary/60',
            )}
            aria-label="Board and list view shortcuts"
          >
            <h3 className="text-label font-bold uppercase tracking-widest text-secondary">
              Board/List view
            </h3>
            <ul className="mt-xs space-y-1">
              {boardListShortcuts.newTask && (
                <li className="flex items-center justify-between gap-sm text-small">
                  <span className="text-secondary">New task</span>
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <kbd className={KEYCAP_CLASS}>
                      {toPrototypeKeyLabel(getDisplayKeys(boardListShortcuts.newTask)[0])}
                    </kbd>
                  </span>
                </li>
              )}
              {boardListShortcuts.navigateDown && boardListShortcuts.navigateUp && (
                <li className="flex items-center justify-between gap-sm text-small">
                  <span className="text-secondary">Navigate up/down in task list</span>
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <kbd className={KEYCAP_CLASS}>
                      {toPrototypeKeyLabel(getDisplayKeys(boardListShortcuts.navigateDown)[0])}
                    </kbd>
                    <span className="text-secondary">/</span>
                    <kbd className={KEYCAP_CLASS}>
                      {toPrototypeKeyLabel(getDisplayKeys(boardListShortcuts.navigateUp)[0])}
                    </kbd>
                  </span>
                </li>
              )}
              {boardListShortcuts.openFocusedTask && (
                <li className="flex items-center justify-between gap-sm text-small">
                  <span className="text-secondary">Open selected task detail</span>
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <kbd className={KEYCAP_CLASS}>
                      {toPrototypeKeyLabel(getDisplayKeys(boardListShortcuts.openFocusedTask)[0])}
                    </kbd>
                  </span>
                </li>
              )}
              <li className="flex items-center justify-between gap-sm text-small">
                <span className="text-secondary">Set priority (1 critical → 5 none)</span>
                <span className="inline-flex shrink-0 items-center gap-1">
                  <kbd className={KEYCAP_CLASS}>1</kbd>
                  <span className="text-secondary">-</span>
                  <kbd className={KEYCAP_CLASS}>5</kbd>
                </span>
              </li>
            </ul>
          </section>

          <section
            className={cn(
              'rounded-radius-lg border border-outline-variant bg-surface-container-low p-sm',
              SECTION_ACTIVE_SCOPES['task-detail'].includes(activeScope) &&
                'border-brand-primary/60',
            )}
            aria-label="Task detail shortcuts"
          >
            <h3 className="text-label font-bold uppercase tracking-widest text-secondary">
              Task detail
            </h3>
            <ul className="mt-xs space-y-1">
              {grouped['task-detail'].map((shortcut) => (
                <li
                  key={shortcut.id}
                  className="flex items-center justify-between gap-sm text-small"
                >
                  <span className="text-secondary">
                    {shortcut.id === 'task-detail.assign' && 'Assign task'}
                    {shortcut.id === 'task-detail.labels' && 'Add label'}
                    {shortcut.id === 'task-detail.status' && 'Change status'}
                    {shortcut.id === 'task-detail.comment' && 'Focus comment input'}
                    {shortcut.id === 'task-detail.edit-description' && 'Edit description'}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1">
                    {getDisplayKeys(shortcut).map((part) => (
                      <kbd key={`${shortcut.id}-${part}`} className={KEYCAP_CLASS}>
                        {toPrototypeKeyLabel(part)}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section
            className={cn(
              'rounded-radius-lg border border-outline-variant bg-surface-container-low p-sm',
              SECTION_ACTIVE_SCOPES.overlay.includes(activeScope) && 'border-brand-primary/60',
            )}
            aria-label="Overlay scope shortcuts"
          >
            <h3 className="text-label font-bold uppercase tracking-widest text-secondary">
              Overlay scope
            </h3>
            <ul className="mt-xs space-y-1">
              <li className="flex items-center justify-between gap-sm text-small">
                <span className="text-secondary">Close overlay</span>
                <span className="inline-flex shrink-0 items-center gap-1">
                  <kbd className={KEYCAP_CLASS}>Esc</kbd>
                </span>
              </li>
              <li className="flex items-center justify-between gap-sm text-small">
                <span className="text-secondary">Move through focusable controls</span>
                <span className="inline-flex shrink-0 items-center gap-1">
                  <kbd className={KEYCAP_CLASS}>Tab</kbd>
                </span>
              </li>
            </ul>
          </section>
        </fieldset>
      </dialog>

      <button
        type="button"
        aria-label="Open keyboard shortcuts"
        onClick={() => onOpenChange(true)}
        className="fixed bottom-lg right-lg z-40 inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface-container-low text-foreground shadow-3 transition-colors hover:bg-surface-container"
      >
        <CircleHelp className="size-5" />
      </button>
    </>
  );
}
