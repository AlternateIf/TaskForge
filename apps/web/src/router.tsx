import { AppShell } from '@/components/layout/app-shell';
import { ConfirmEmailChangePage } from '@/routes/auth/confirm-email-change';
import { ForcePasswordPage } from '@/routes/auth/force-password';
import { ForgotPasswordPage } from '@/routes/auth/forgot-password';
import { InvitePage } from '@/routes/auth/invite';
import { LoginPage } from '@/routes/auth/login';
import { MfaPage } from '@/routes/auth/mfa';
import { OAuthCallbackPage } from '@/routes/auth/oauth-callback';
import { RegisterPage } from '@/routes/auth/register';
import { ResetPasswordPage } from '@/routes/auth/reset-password';
import { DashboardPage } from '@/routes/dashboard';
import { PrivacyPage } from '@/routes/legal/privacy';
import { TermsPage } from '@/routes/legal/terms';
import { NotFoundPage } from '@/routes/not-found';
import { GlobalNotFoundRedirect } from '@/routes/not-found/global-not-found';
import { ProjectsPage } from '@/routes/projects';
import { ProjectIndexPage } from '@/routes/projects/[projectId]';
import { ProjectBoardPage } from '@/routes/projects/[projectId]/board';
import { ProjectListPage } from '@/routes/projects/[projectId]/list';
import { validateProjectViewSearch } from '@/routes/projects/[projectId]/project-search-params';
import { ProjectSettingsPage } from '@/routes/projects/[projectId]/settings';
import { ProjectTaskDetailPage } from '@/routes/projects/[projectId]/tasks/[taskId]';
import { SettingsPage } from '@/routes/settings';
import { OrganizationSettingsPage } from '@/routes/settings/organization';
import { OrganizationPermissionsPage } from '@/routes/settings/permissions';
import { useAuthStore } from '@/stores/auth.store';
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useParams,
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
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated) {
      throw redirect({
        to: '/auth/login',
        search: { redirect: location.pathname },
      });
    }

    const mustChangePassword = authState.user?.mustChangePassword ?? false;
    if (mustChangePassword && location.pathname !== '/force-password') {
      throw redirect({ to: '/force-password' });
    }

    if (!mustChangePassword && location.pathname === '/force-password') {
      throw redirect({ to: '/dashboard' });
    }
  },
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/dashboard',
  component: DashboardPage,
});

// ─── Projects ─────────────────────────────────────────────────────────────────

const projectsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/projects',
  component: ProjectsPage,
});

const projectIndexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/projects/$projectId',
  component: function ProjectIndexWrapper() {
    const { projectId } = useParams({ strict: false }) as { projectId: string };
    return <ProjectIndexPage projectId={projectId} />;
  },
});

const projectBoardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/projects/$projectId/board',
  validateSearch: validateProjectViewSearch,
  component: function ProjectBoardWrapper() {
    const { projectId } = useParams({ strict: false }) as { projectId: string };
    return <ProjectBoardPage projectId={projectId} />;
  },
});

const projectListRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/projects/$projectId/list',
  validateSearch: validateProjectViewSearch,
  component: function ProjectListWrapper() {
    const { projectId } = useParams({ strict: false }) as { projectId: string };
    return <ProjectListPage projectId={projectId} />;
  },
});

const projectTaskDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/projects/$projectId/tasks/$taskId',
  component: function ProjectTaskDetailWrapper() {
    const { projectId, taskId } = useParams({ strict: false }) as {
      projectId: string;
      taskId: string;
    };
    return <ProjectTaskDetailPage projectId={projectId} taskId={taskId} />;
  },
});

const projectSettingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/projects/$projectId/settings',
  component: function ProjectSettingsWrapper() {
    const { projectId } = useParams({ strict: false }) as { projectId: string };
    return <ProjectSettingsPage projectId={projectId} />;
  },
});

// ─── Settings ─────────────────────────────────────────────────────────────────

const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings',
  component: SettingsPage,
});

const organizationSettingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings/organization',
  component: OrganizationSettingsPage,
});

const organizationPermissionsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/settings/permissions',
  component: OrganizationPermissionsPage,
});

const forcePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/force-password',
  beforeLoad: () => {
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated) {
      throw redirect({ to: '/auth/login', search: { redirect: undefined } });
    }
    if (!authState.user?.mustChangePassword) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: ForcePasswordPage,
});

const notFoundRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/not-found',
  component: NotFoundPage,
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

const confirmEmailChangeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/confirm-email-change',
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ConfirmEmailChangePage,
});

const oauthCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/oauth-callback',
  component: OAuthCallbackPage,
});

const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/invite/$token',
  component: function InviteWrapper() {
    const { token } = useParams({ strict: false }) as { token: string };
    return <InvitePage token={token} />;
  },
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
  authenticatedRoute.addChildren([
    dashboardRoute,
    projectsRoute,
    projectIndexRoute,
    projectBoardRoute,
    projectListRoute,
    projectTaskDetailRoute,
    projectSettingsRoute,
    settingsRoute,
    organizationSettingsRoute,
    organizationPermissionsRoute,
    notFoundRoute,
  ]),
  forcePasswordRoute,
  loginRoute,
  registerRoute,
  mfaRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  confirmEmailChangeRoute,
  oauthCallbackRoute,
  inviteRoute,
  termsRoute,
  privacyRoute,
]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: GlobalNotFoundRedirect,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
