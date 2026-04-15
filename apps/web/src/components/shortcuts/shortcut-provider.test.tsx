import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShortcutProvider } from './shortcut-provider';

function renderProvider(pathname = '/dashboard') {
  return render(
    <>
      <button type="button" data-testid="origin-focus">
        Origin focus
      </button>
      <ShortcutProvider pathname={pathname}>
        <div>App body</div>
      </ShortcutProvider>
    </>,
  );
}

describe('ShortcutProvider + ShortcutOverlay', () => {
  it('opens overlay with ? and closes with Escape', async () => {
    renderProvider();

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: '?',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Compact modal cheat sheet' })).toBeInTheDocument();
    });

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Compact modal cheat sheet' }),
      ).not.toBeInTheDocument();
    });
  });

  it('restores focus to previous element after close', async () => {
    renderProvider();

    const origin = screen.getByTestId('origin-focus');
    origin.focus();

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: '?',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Compact modal cheat sheet' })).toBeInTheDocument();
    });

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(origin);
    });
  });

  it('shows active scope metadata and help trigger', () => {
    renderProvider('/projects/project-1/list');

    expect(
      screen.getByRole('button', {
        name: 'Open keyboard shortcuts',
      }),
    ).toBeInTheDocument();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: '?',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    const scopeDescription = screen.getByText('Active scope:').closest('p');
    expect(scopeDescription).toHaveTextContent('Active scope: List');
  });
});
