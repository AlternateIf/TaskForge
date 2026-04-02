import { useAuthStore } from '@/stores/auth.store';
import { Navigate, useRouterState } from '@tanstack/react-router';

export function GlobalNotFoundRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const locationHref = useRouterState({ select: (state) => state.location.href });

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" search={{ redirect: locationHref }} replace />;
  }

  return <Navigate to="/not-found" replace />;
}
