import {
  CHORD_TIMEOUT_MS,
  type ShortcutModifierRequirements,
  type ShortcutScope,
} from '@taskforge/shared';
import { useCallback, useEffect, useRef } from 'react';

export interface RuntimeShortcut {
  id: string;
  scope: ShortcutScope;
  key?: string;
  chord?: readonly [string, string];
  modifiers?: ShortcutModifierRequirements;
  allowInInput?: boolean;
  preventDefault?: boolean;
  enabled?: boolean;
  handler: (event: KeyboardEvent) => void;
}

interface UseShortcutsEngineOptions {
  activeScope: ShortcutScope;
  scopeOverride?: ShortcutScope | null;
  overlayOpen: boolean;
}

interface ChordState {
  firstKey: string;
  startedAt: number;
}

export function detectShortcutScope(pathname: string): ShortcutScope {
  if (/^\/projects\/[^/]+\/board(?:\/|$)/.test(pathname)) {
    return 'board';
  }
  if (/^\/projects\/[^/]+\/list(?:\/|$)/.test(pathname)) {
    return 'list';
  }
  if (/^\/projects\/[^/]+\/tasks\/[^/]+(?:\/|$)/.test(pathname)) {
    return 'task-detail';
  }
  return 'global';
}

export function normalizeShortcutKey(event: Pick<KeyboardEvent, 'key' | 'shiftKey'>): string {
  if (event.key === 'Escape' || event.key === 'Esc') {
    return 'escape';
  }
  if (event.key === 'Enter') {
    return 'enter';
  }
  if (event.key === '7' && event.shiftKey) {
    return '/';
  }
  if (event.key === '?') {
    return '?';
  }
  if (event.key.length === 1) {
    return event.key.toLowerCase();
  }
  return event.key.toLowerCase();
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return true;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }

  return Boolean(
    target.closest('[contenteditable="true"], [contenteditable=""], [role="textbox"]'),
  );
}

function modifiersMatch(
  event: Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
  modifiers?: ShortcutModifierRequirements,
): boolean {
  if (event.metaKey && !modifiers?.metaKey) {
    return false;
  }
  if (event.ctrlKey && !modifiers?.ctrlKey) {
    return false;
  }
  if (event.altKey && !modifiers?.altKey) {
    return false;
  }

  if (modifiers?.metaKey && !event.metaKey) {
    return false;
  }
  if (modifiers?.ctrlKey && !event.ctrlKey) {
    return false;
  }
  if (modifiers?.altKey && !event.altKey) {
    return false;
  }

  return typeof modifiers?.shiftKey !== 'boolean' || event.shiftKey === modifiers.shiftKey;
}

function isScopeActive(
  shortcutScope: ShortcutScope,
  activeScope: ShortcutScope,
  overlayOpen: boolean,
): boolean {
  if (overlayOpen) {
    return shortcutScope === 'overlay';
  }

  return shortcutScope === 'global' || shortcutScope === activeScope;
}

export function useShortcutsEngine({
  activeScope,
  scopeOverride,
  overlayOpen,
}: UseShortcutsEngineOptions) {
  const shortcutsRef = useRef<Map<string, RuntimeShortcut>>(new Map());
  const activeScopeRef = useRef<ShortcutScope>(activeScope);
  const scopeOverrideRef = useRef<ShortcutScope | null>(scopeOverride ?? null);
  const overlayOpenRef = useRef<boolean>(overlayOpen);
  const chordStateRef = useRef<ChordState | null>(null);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeScopeRef.current = activeScope;
  }, [activeScope]);

  useEffect(() => {
    scopeOverrideRef.current = scopeOverride ?? null;
  }, [scopeOverride]);

  useEffect(() => {
    overlayOpenRef.current = overlayOpen;
    if (overlayOpen) {
      chordStateRef.current = null;
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current);
        chordTimerRef.current = null;
      }
    }
  }, [overlayOpen]);

  const registerShortcut = useCallback((shortcut: RuntimeShortcut) => {
    shortcutsRef.current.set(shortcut.id, shortcut);

    return () => {
      shortcutsRef.current.delete(shortcut.id);
    };
  }, []);

  useEffect(() => {
    function clearChordState() {
      chordStateRef.current = null;
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current);
        chordTimerRef.current = null;
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.isComposing) {
        return;
      }

      const key = normalizeShortcutKey(event);
      const scope = scopeOverrideRef.current ?? activeScopeRef.current;
      const overlayIsOpen = overlayOpenRef.current;
      const typing = isTypingTarget(event.target);

      const candidates = [...shortcutsRef.current.values()].filter((shortcut) => {
        if (shortcut.enabled === false) {
          return false;
        }
        if (!isScopeActive(shortcut.scope, scope, overlayIsOpen)) {
          return false;
        }
        if (typing && !shortcut.allowInInput) {
          return false;
        }
        return modifiersMatch(event, shortcut.modifiers);
      });

      const now = Date.now();

      if (chordStateRef.current && now - chordStateRef.current.startedAt > CHORD_TIMEOUT_MS) {
        clearChordState();
      }

      if (chordStateRef.current) {
        const match = candidates.find(
          (shortcut) =>
            shortcut.chord &&
            shortcut.chord[0] === chordStateRef.current?.firstKey &&
            shortcut.chord[1] === key,
        );

        if (match) {
          if (match.preventDefault !== false) {
            event.preventDefault();
          }
          clearChordState();
          match.handler(event);
          return;
        }

        clearChordState();
      }

      const matchingSingle = candidates.find((shortcut) => shortcut.key === key);
      if (matchingSingle) {
        if (matchingSingle.preventDefault !== false) {
          event.preventDefault();
        }
        matchingSingle.handler(event);
        return;
      }

      const firstChordCandidate = candidates.find((shortcut) => shortcut.chord?.[0] === key);
      if (firstChordCandidate?.chord) {
        chordStateRef.current = {
          firstKey: firstChordCandidate.chord[0],
          startedAt: now,
        };
        if (firstChordCandidate.preventDefault !== false) {
          event.preventDefault();
        }
        chordTimerRef.current = setTimeout(() => {
          clearChordState();
        }, CHORD_TIMEOUT_MS);
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current);
      }
    };
  }, []);

  return {
    registerShortcut,
  };
}
