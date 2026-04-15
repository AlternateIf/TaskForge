import { render } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type RuntimeShortcut, detectShortcutScope, useShortcutsEngine } from './use-shortcuts';

function EngineHarness({
  shortcuts,
  activeScope,
  overlayOpen,
}: {
  shortcuts: RuntimeShortcut[];
  activeScope: RuntimeShortcut['scope'];
  overlayOpen: boolean;
}) {
  const { registerShortcut } = useShortcutsEngine({ activeScope, overlayOpen });

  React.useEffect(() => {
    const unregister = shortcuts.map((shortcut) => registerShortcut(shortcut));
    return () => {
      for (const callback of unregister) {
        callback();
      }
    };
  }, [registerShortcut, shortcuts]);

  return null;
}

describe('useShortcutsEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('detects route scopes from pathnames', () => {
    expect(detectShortcutScope('/dashboard')).toBe('global');
    expect(detectShortcutScope('/projects/abc/board')).toBe('board');
    expect(detectShortcutScope('/projects/abc/list')).toBe('list');
    expect(detectShortcutScope('/projects/abc/tasks/def')).toBe('task-detail');
  });

  it('handles chord shortcuts within 500ms and resets on timeout', () => {
    const onDashboard = vi.fn();
    const onProjects = vi.fn();

    render(
      <EngineHarness
        activeScope="global"
        overlayOpen={false}
        shortcuts={[
          {
            id: 'go-dashboard',
            scope: 'global',
            chord: ['g', 'd'],
            preventDefault: true,
            handler: onDashboard,
          },
          {
            id: 'go-projects',
            scope: 'global',
            chord: ['g', 'p'],
            preventDefault: true,
            handler: onProjects,
          },
        ]}
      />,
    );

    const first = new KeyboardEvent('keydown', { key: 'g', bubbles: true, cancelable: true });
    document.dispatchEvent(first);
    expect(first.defaultPrevented).toBe(true);

    const second = new KeyboardEvent('keydown', { key: 'd', bubbles: true, cancelable: true });
    document.dispatchEvent(second);
    expect(onDashboard).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(true);

    const firstProjects = new KeyboardEvent('keydown', {
      key: 'g',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(firstProjects);
    const secondProjects = new KeyboardEvent('keydown', {
      key: 'p',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(secondProjects);
    expect(onProjects).toHaveBeenCalledTimes(1);
    expect(secondProjects.defaultPrevented).toBe(true);

    const lateFirst = new KeyboardEvent('keydown', { key: 'g', bubbles: true, cancelable: true });
    document.dispatchEvent(lateFirst);
    vi.advanceTimersByTime(501);
    const lateSecond = new KeyboardEvent('keydown', { key: 'd', bubbles: true, cancelable: true });
    document.dispatchEvent(lateSecond);

    expect(onDashboard).toHaveBeenCalledTimes(1);
    expect(onProjects).toHaveBeenCalledTimes(1);
  });

  it('blocks shortcuts in typing inputs except explicitly allowed ones', () => {
    const onSlash = vi.fn();
    const onEscape = vi.fn();

    render(
      <>
        <input aria-label="typing" />
        <EngineHarness
          activeScope="global"
          overlayOpen={false}
          shortcuts={[
            {
              id: 'focus-search',
              scope: 'global',
              key: '/',
              handler: onSlash,
            },
            {
              id: 'close-layer',
              scope: 'global',
              key: 'escape',
              allowInInput: true,
              handler: onEscape,
            },
          ]}
        />
      </>,
    );

    const input = document.querySelector('input');
    input?.focus();

    input?.dispatchEvent(
      new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }),
    );
    input?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );

    expect(onSlash).not.toHaveBeenCalled();
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('rejects meta/ctrl/alt modified keydowns unless required', () => {
    const onShortcut = vi.fn();

    render(
      <EngineHarness
        activeScope="global"
        overlayOpen={false}
        shortcuts={[
          {
            id: 'plain-j',
            scope: 'global',
            key: 'j',
            handler: onShortcut,
          },
        ]}
      />,
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'j', ctrlKey: true, bubbles: true, cancelable: true }),
    );

    expect(onShortcut).not.toHaveBeenCalled();
  });

  it('suspends non-overlay shortcuts while overlay is open', () => {
    const onGlobal = vi.fn();
    const onOverlay = vi.fn();

    const { rerender } = render(
      <EngineHarness
        activeScope="global"
        overlayOpen={false}
        shortcuts={[
          { id: 'global-n', scope: 'global', key: 'n', handler: onGlobal },
          { id: 'overlay-escape', scope: 'overlay', key: 'escape', handler: onOverlay },
        ]}
      />,
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true }),
    );
    expect(onGlobal).toHaveBeenCalledTimes(1);

    rerender(
      <EngineHarness
        activeScope="global"
        overlayOpen
        shortcuts={[
          { id: 'global-n', scope: 'global', key: 'n', handler: onGlobal },
          { id: 'overlay-escape', scope: 'overlay', key: 'escape', handler: onOverlay },
        ]}
      />,
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true }),
    );
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );

    expect(onGlobal).toHaveBeenCalledTimes(1);
    expect(onOverlay).toHaveBeenCalledTimes(1);
  });

  it('prevents default only for matched shortcuts', () => {
    const onSlash = vi.fn();

    render(
      <EngineHarness
        activeScope="global"
        overlayOpen={false}
        shortcuts={[
          {
            id: 'slash',
            scope: 'global',
            key: '/',
            preventDefault: true,
            handler: onSlash,
          },
        ]}
      />,
    );

    const matched = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    document.dispatchEvent(matched);
    const unmatched = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true });
    document.dispatchEvent(unmatched);

    expect(matched.defaultPrevented).toBe(true);
    expect(unmatched.defaultPrevented).toBe(false);
  });

  it('matches slash shortcut for direct / and German Shift+7 variants', () => {
    const onSlash = vi.fn();
    const onOverlay = vi.fn();

    render(
      <EngineHarness
        activeScope="global"
        overlayOpen={false}
        shortcuts={[
          {
            id: 'slash',
            scope: 'global',
            key: '/',
            preventDefault: true,
            handler: onSlash,
          },
          {
            id: 'overlay',
            scope: 'global',
            key: '?',
            modifiers: { shiftKey: true },
            preventDefault: true,
            handler: onOverlay,
          },
        ]}
      />,
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }),
    );
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '/',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '7',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '?',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onSlash).toHaveBeenCalledTimes(3);
    expect(onOverlay).toHaveBeenCalledTimes(1);
  });
});
