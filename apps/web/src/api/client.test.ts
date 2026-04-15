import type { ApiError } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

function mockFetch(responses: Response[]) {
  let call = 0;
  const fn: typeof fetch = () =>
    Promise.resolve(responses[call++] ?? responses[responses.length - 1]);
  return vi.fn(fn);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, message: string): Response {
  return jsonResponse({ message }, status);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('apiClient', () => {
  describe('GET request', () => {
    it('returns parsed JSON on success', async () => {
      const { apiClient } = await import('./client');
      vi.stubGlobal('fetch', mockFetch([jsonResponse({ data: { id: '1' } })]));
      const result = await apiClient.get<{ data: { id: string } }>('/test');
      expect(result).toEqual({ data: { id: '1' } });
    });

    it('attaches Authorization header when token is set', async () => {
      const { apiClient } = await import('./client');
      useAuthStore.setState({ token: 'tok-abc', user: null, isAuthenticated: true });
      const fetchMock = mockFetch([jsonResponse({ data: {} })]);
      vi.stubGlobal('fetch', fetchMock);
      await apiClient.get('/test');
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      const headers = init?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer tok-abc');
    });

    it('does not attach Authorization header when no token', async () => {
      const { apiClient } = await import('./client');
      const fetchMock = mockFetch([jsonResponse({ data: {} })]);
      vi.stubGlobal('fetch', fetchMock);
      await apiClient.get('/test');
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      const headers = init?.headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });
  });

  describe('POST request', () => {
    it('sends JSON body with Content-Type header', async () => {
      const { apiClient } = await import('./client');
      const fetchMock = mockFetch([jsonResponse({ data: {} })]);
      vi.stubGlobal('fetch', fetchMock);
      await apiClient.post('/test', { email: 'a@b.com' });
      const init = fetchMock.mock.calls[0][1] as RequestInit;
      const headers = init?.headers as Headers;
      expect(headers.get('Content-Type')).toBe('application/json');
      expect(init?.body).toBe('{"email":"a@b.com"}');
    });
  });

  describe('error handling', () => {
    it('throws ApiError with status and message on non-ok response', async () => {
      const { apiClient } = await import('./client');
      vi.stubGlobal('fetch', mockFetch([errorResponse(404, 'Not found')]));
      await expect(apiClient.get('/missing')).rejects.toMatchObject({
        status: 404,
        message: 'Not found',
      });
    });

    it('returns undefined for 204 No Content', async () => {
      const { apiClient } = await import('./client');
      vi.stubGlobal('fetch', mockFetch([new Response(null, { status: 204 })]));
      const result = await apiClient.delete('/test');
      expect(result).toBeUndefined();
    });

    it('parses transition details from nested error payload', async () => {
      const { apiClient } = await import('./client');
      vi.stubGlobal(
        'fetch',
        mockFetch([
          jsonResponse(
            {
              error: {
                code: 'TRANSITION_BLOCKED',
                message: 'Task cannot be moved to Done while blockers remain.',
                transitionDetails: {
                  unresolvedBlockersCount: 2,
                  incompleteChecklistCount: 3,
                },
              },
            },
            422,
          ),
        ]),
      );

      await expect(apiClient.patch('/tasks/task-1', { statusId: 'done' })).rejects.toMatchObject({
        status: 422,
        code: 'TRANSITION_BLOCKED',
        message: 'Task cannot be moved to Done while blockers remain.',
        details: {
          unresolvedBlockersCount: 2,
          incompleteChecklistCount: 3,
        },
      });
    });

    it('parses TRANSITION_BLOCKED error at top level for backend rejection', async () => {
      const { apiClient } = await import('./client');
      vi.stubGlobal(
        'fetch',
        mockFetch([
          jsonResponse(
            {
              code: 'TRANSITION_BLOCKED',
              message: 'Cannot transition to Done: 3 incomplete checklist items.',
            },
            422,
          ),
        ]),
      );

      const error = (await apiClient
        .patch('/tasks/task-1', { statusId: 'done' })
        .catch((e) => e)) as ApiError;
      expect(error.status).toBe(422);
      expect(error.code).toBe('TRANSITION_BLOCKED');
      expect(error.message).toBe('Cannot transition to Done: 3 incomplete checklist items.');
    });

    it('preserves error message for generic 422 validation rejection', async () => {
      const { apiClient } = await import('./client');
      vi.stubGlobal(
        'fetch',
        mockFetch([
          jsonResponse(
            {
              message: 'Validation failed: statusId is not a valid transition.',
            },
            422,
          ),
        ]),
      );

      const error = (await apiClient
        .patch('/tasks/task-1', { statusId: 'invalid' })
        .catch((e) => e)) as ApiError;
      expect(error.status).toBe(422);
      expect(error.message).toBe('Validation failed: statusId is not a valid transition.');
    });

    it('extracts nested error.details for backend rejection with transitionDetails', async () => {
      const { apiClient, isApiError } = await import('./client');
      vi.stubGlobal(
        'fetch',
        mockFetch([
          jsonResponse(
            {
              error: {
                code: 'TRANSITION_BLOCKED',
                message: 'Blocked transition.',
                transitionDetails: {
                  unresolvedBlockersCount: 5,
                  incompleteChecklistCount: 2,
                },
              },
            },
            422,
          ),
        ]),
      );

      try {
        await apiClient.patch('/tasks/task-1', { statusId: 'done' });
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        expect((err as ApiError).status).toBe(422);
        expect((err as ApiError).code).toBe('TRANSITION_BLOCKED');
        expect((err as ApiError).message).toBe('Blocked transition.');
        expect((err as ApiError).details).toEqual({
          unresolvedBlockersCount: 5,
          incompleteChecklistCount: 2,
        });
      }
    });
  });

  describe('token refresh', () => {
    it('refreshes token on 401 and retries the request', async () => {
      const { apiClient } = await import('./client');
      useAuthStore.setState({ token: 'old-token', user: null, isAuthenticated: true });

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockResolvedValueOnce(jsonResponse({ data: { accessToken: 'new-token' } })) // refresh call
        .mockResolvedValueOnce(jsonResponse({ data: { result: true } })); // retry

      vi.stubGlobal('fetch', fetchMock);
      const result = await apiClient.get<{ data: { result: boolean } }>('/protected');
      expect(result).toEqual({ data: { result: true } });
      expect(useAuthStore.getState().token).toBe('new-token');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('clears auth and dispatches tf:auth:expired when refresh fails', async () => {
      const { apiClient } = await import('./client');
      useAuthStore.setState({ token: 'old-token', user: null, isAuthenticated: true });

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockResolvedValueOnce(new Response(null, { status: 401 })); // refresh also fails

      vi.stubGlobal('fetch', fetchMock);

      const expiredEvents: Event[] = [];
      window.addEventListener('tf:auth:expired', (e) => expiredEvents.push(e));

      await expect(apiClient.get('/protected')).rejects.toMatchObject({
        status: 401,
        code: 'AUTH_EXPIRED',
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(expiredEvents).toHaveLength(1);

      window.removeEventListener('tf:auth:expired', () => {});
    });

    it('does not retry refresh endpoint on 401', async () => {
      const { apiClient } = await import('./client');
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
      vi.stubGlobal('fetch', fetchMock);
      await expect(apiClient.post('/auth/refresh')).rejects.toMatchObject({ status: 401 });
      // Only one fetch call — no refresh retry loop
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('queryClient retry logic', () => {
    it('does not retry on 401, 403, or 404', async () => {
      const { queryClient } = await import('./client');
      const retryFn = queryClient.getDefaultOptions().queries?.retry as (
        failureCount: number,
        error: unknown,
      ) => boolean;

      expect(retryFn(0, { status: 401 })).toBe(false);
      expect(retryFn(0, { status: 403 })).toBe(false);
      expect(retryFn(0, { status: 404 })).toBe(false);
    });

    it('retries up to 2 times on server errors', async () => {
      const { queryClient } = await import('./client');
      const retryFn = queryClient.getDefaultOptions().queries?.retry as (
        failureCount: number,
        error: unknown,
      ) => boolean;

      expect(retryFn(0, { status: 500 })).toBe(true);
      expect(retryFn(1, { status: 500 })).toBe(true);
      expect(retryFn(2, { status: 500 })).toBe(false);
    });
  });

  describe('isApiError helper', () => {
    it('identifies ApiError instances', async () => {
      const { apiClient, isApiError } = await import('./client');
      vi.stubGlobal('fetch', mockFetch([errorResponse(422, 'Error')]));
      try {
        await apiClient.get('/fail');
      } catch (err) {
        expect(isApiError(err)).toBe(true);
      }
    });

    it('returns false for non-ApiError values', async () => {
      const { isApiError } = await import('./client');
      expect(isApiError(new Error('generic'))).toBe(false);
      expect(isApiError(null)).toBe(false);
      expect(isApiError('string')).toBe(false);
      expect(isApiError(42)).toBe(false);
    });
  });
});
