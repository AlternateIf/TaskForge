import { useAuthStore } from '@/stores/auth.store';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalNotFoundRedirect } from './global-not-found';

let currentHref = '/missing';
const navigateCalls: Array<Record<string, unknown>> = [];

vi.mock('@tanstack/react-router', () => ({
  Navigate: (props: Record<string, unknown>) => {
    navigateCalls.push(props);
    return null;
  },
  useRouterState: ({ select }: { select: (state: { location: { href: string } }) => string }) =>
    select({ location: { href: currentHref } }),
}));

describe('GlobalNotFoundRedirect', () => {
  beforeEach(() => {
    navigateCalls.length = 0;
    currentHref = '/missing';
    act(() => {
      useAuthStore.getState().clearAuth();
    });
  });

  afterEach(() => {
    act(() => {
      useAuthStore.getState().clearAuth();
    });
  });

  it('redirects logged-out users to login with full href', () => {
    currentHref = '/unknown/path?tab=open#activity';

    render(<GlobalNotFoundRedirect />);

    expect(navigateCalls[0]).toMatchObject({
      to: '/auth/login',
      search: { redirect: '/unknown/path?tab=open#activity' },
      replace: true,
    });
  });

  it('redirects logged-in users to authenticated not-found page', () => {
    act(() => {
      useAuthStore.getState().setAuth('token-1', {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        organizationId: 'org-1',
        organizationName: 'TaskForge',
      });
    });

    render(<GlobalNotFoundRedirect />);

    expect(navigateCalls[0]).toMatchObject({
      to: '/not-found',
      replace: true,
    });
  });
});
