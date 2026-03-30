import { AppShell } from '@/components/layout/app-shell';
import { ForgotPasswordPage } from '@/routes/auth/forgot-password';
import { LoginPage } from '@/routes/auth/login';
import { MfaPage } from '@/routes/auth/mfa';
import { OAuthCallbackPage } from '@/routes/auth/oauth-callback';
import { RegisterPage } from '@/routes/auth/register';
import { ResetPasswordPage } from '@/routes/auth/reset-password';
import { DashboardPage } from '@/routes/dashboard';
import { PrivacyPage } from '@/routes/legal/privacy';
import { TermsPage } from '@/routes/legal/terms';
import { useAuthStore } from '@/stores/auth.store';
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';

// ─── Root ─────────────────────────────────────────────────────────────────────

// Root route renders a bare Outlet — providers live in App.tsx (outside RouterProvider)
const rootRoute = createRootRoute({ component: () => <Outlet /> });

// ─── Authenticated layout ─────────────────────────────────────────────────────

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authenticated',
  component: AppShell,
  beforeLoad: ({ location }) => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({
        to: '/auth/login',
        search: { redirect: location.pathname },
      });
    }
  },
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/dashboard',
  component: DashboardPage,
});

// ─── Index redirect ───────────────────────────────────────────────────────────

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' });
  },
});

// ─── Auth routes ──────────────────────────────────────────────────────────────

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/login',
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/register',
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: RegisterPage,
});

const mfaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/mfa',
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: MfaPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/forgot-password',
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/reset-password',
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPasswordPage,
});

const oauthCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/oauth-callback',
  component: OAuthCallbackPage,
});

// ─── Legal routes ─────────────────────────────────────────────────────────────

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  component: TermsPage,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: PrivacyPage,
});

// ─── Route tree ───────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  indexRoute,
  authenticatedRoute.addChildren([dashboardRoute]),
  loginRoute,
  registerRoute,
  mfaRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  oauthCallbackRoute,
  termsRoute,
  privacyRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
