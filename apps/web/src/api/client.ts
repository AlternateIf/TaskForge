import { useAuthStore } from '@/stores/auth.store';
import { QueryClient } from '@tanstack/react-query';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

// ─── Token refresh state ───────────────────────────────────────────────────────

let isRefreshing = false;
type PendingResolve = (token: string | null) => void;
const pendingQueue: PendingResolve[] = [];

function resolvePending(token: string | null) {
  for (const resolve of pendingQueue.splice(0)) resolve(token);
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // sends HttpOnly refresh cookie automatically
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data: { accessToken: string } };
    return data.data.accessToken;
  } catch {
    return null;
  }
}

// ─── Core request function ─────────────────────────────────────────────────────

export interface ApiError extends Error {
  status: number;
  code?: string;
}

function createApiError(message: string, status: number, code?: string): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.code = code;
  return error;
}

async function request<T>(path: string, options: RequestInit = {}, _isRetry = false): Promise<T> {
  const { token } = useAuthStore.getState();

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  // Handle 401: attempt token refresh once
  if (res.status === 401 && !_isRetry && !path.includes('/auth/refresh')) {
    if (isRefreshing) {
      // Another refresh is already in-flight — wait for it
      const newToken = await new Promise<string | null>((resolve) => {
        pendingQueue.push(resolve);
      });
      if (newToken) {
        return request<T>(path, options, true);
      }
    } else {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        useAuthStore.getState().setToken(newToken);
        resolvePending(newToken);
        return request<T>(path, options, true);
      }
      resolvePending(null);
      useAuthStore.getState().clearAuth();
      // Navigate to login — use a custom event so components can react
      window.dispatchEvent(new CustomEvent('tf:auth:expired'));
      throw createApiError('Session expired. Please sign in again.', 401, 'AUTH_EXPIRED');
    }
  }

  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    try {
      const body = (await res.json()) as {
        code?: string;
        message?: string;
        error?:
          | string
          | {
              code?: string;
              message?: string;
            };
      };
      if (body.code) {
        code = body.code;
      }
      if (typeof body.error === 'string') {
        message = body.error;
      } else if (body.error && typeof body.error === 'object') {
        message = body.error.message ?? body.message ?? message;
        code = body.error.code ?? code;
      } else {
        message = body.message ?? message;
      }
    } catch {
      // non-JSON error body
    }
    throw createApiError(message, res.status, code);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: 'PATCH',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      method: 'PUT',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: 'DELETE', ...options }),
};

// ─── TanStack Query client ─────────────────────────────────────────────────────

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const apiError = error as ApiError;
        // Don't retry auth errors or not-found
        if (apiError.status === 401 || apiError.status === 403 || apiError.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
