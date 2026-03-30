import { ThemeProvider, useTheme } from '@/components/theme-provider';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function ThemeConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={() => setTheme('dark')} data-testid="set-dark">
        Dark
      </button>
      <button type="button" onClick={() => setTheme('light')} data-testid="set-light">
        Light
      </button>
      <button type="button" onClick={() => setTheme('system')} data-testid="set-system">
        System
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  let matchMediaListeners: ((e: { matches: boolean }) => void)[];

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
    matchMediaListeners = [];

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: (_event: string, handler: (e: { matches: boolean }) => void) => {
          matchMediaListeners.push(handler);
        },
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to system theme', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme').textContent).toBe('system');
    expect(screen.getByTestId('resolved').textContent).toBe('light');
  });

  it('applies dark class when set to dark', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByTestId('set-dark'));

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('persists theme to localStorage', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByTestId('set-dark'));
    expect(localStorage.getItem('taskforge-theme')).toBe('dark');

    await user.click(screen.getByTestId('set-light'));
    expect(localStorage.getItem('taskforge-theme')).toBe('light');
  });

  it('restores theme from localStorage', () => {
    localStorage.setItem('taskforge-theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
  });

  it('responds to system preference changes when set to system', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByTestId('set-system'));
    expect(screen.getByTestId('resolved').textContent).toBe('light');

    // Simulate system theme change to dark
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    act(() => {
      for (const listener of matchMediaListeners) {
        listener({ matches: true });
      }
    });

    expect(screen.getByTestId('resolved').textContent).toBe('dark');
  });

  it('throws when useTheme is used outside ThemeProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<ThemeConsumer />)).toThrow('useTheme must be used within ThemeProvider');

    consoleError.mockRestore();
  });

  it('updates meta theme-color tag', async () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#2563EB');
    document.head.appendChild(meta);

    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByTestId('set-dark'));
    expect(meta.getAttribute('content')).toBe('#3B82F6');

    await user.click(screen.getByTestId('set-light'));
    expect(meta.getAttribute('content')).toBe('#2563EB');

    document.head.removeChild(meta);
  });
});
