# MVP-022: Frontend — App Shell & Auth Pages

## Description
Initialize the React app with Vite, Tailwind CSS, shadcn/ui, routing, the app shell (sidebar, header), and authentication pages (login, register, OAuth, MFA, forgot password).

## Personas
- **Priya (Frontend)**: Clean React setup with good DX
- **Finn (Onboarding)**: Auth pages must be simple and inviting
- **Lena (UX)**: Consistent layout, accessible components

## Dependencies
- MVP-001 (apps/web exists)
- MVP-006 (auth API endpoints)
- MVP-007 (OAuth API endpoints)
- MVP-008 (MFA API endpoints)

## Scope

### Files to create
```
apps/web/
├── index.html
├── vite.config.ts              # Proxy /api to backend, path aliases
├── tailwind.config.ts          # Tailwind theme, shadcn/ui plugin
├── src/
│   ├── main.tsx                # React root, QueryClientProvider, RouterProvider
│   ├── App.tsx                 # Router setup (TanStack Router or React Router)
│   ├── api/
│   │   ├── client.ts           # Fetch wrapper: base URL, auth header, refresh on 401
│   │   └── auth.ts             # useLogin, useRegister, useLogout, useRefresh, useMe hooks
│   ├── stores/
│   │   └── auth.store.ts       # Auth state: token, user, isAuthenticated
│   ├── routes/
│   │   └── auth/
│   │       ├── login.tsx        # Email/password + OAuth buttons
│   │       ├── register.tsx     # Registration form
│   │       ├── mfa.tsx          # TOTP input after login
│   │       ├── forgot-password.tsx
│   │       ├── reset-password.tsx
│   │       └── verify-email.tsx
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components (button, input, card, dialog, toast, etc.)
│   │   └── layout/
│   │       ├── app-shell.tsx    # Sidebar + header + main content area
│   │       ├── sidebar.tsx      # Navigation: Dashboard, Projects, Settings
│   │       ├── header.tsx       # User menu, notification bell, org switcher
│   │       └── protected-route.tsx  # Redirect to login if not authenticated
│   └── hooks/
│       └── use-auth.ts          # Auth context hook
```

### API client (`client.ts`)
- Base URL from `VITE_API_URL` env var
- Automatically attaches `Authorization: Bearer <token>` header
- On 401: attempt token refresh via `POST /auth/refresh`
- On refresh failure: redirect to login
- Returns typed responses using shared Zod schemas

### Auth flow
1. User visits any protected route → `protected-route.tsx` checks auth state
2. If no token → redirect to `/auth/login`
3. Login form → calls API → stores token → redirects to dashboard
4. If MFA required → redirect to `/auth/mfa` with mfaToken
5. OAuth: click button → redirect to API OAuth endpoint → callback sets token

### App shell layout
```
┌─────────────────────────────────────┐
│ Header: [Org switcher] [Search] [🔔] [User menu] │
├────────┬────────────────────────────┤
│        │                            │
│ Side-  │     Main content area      │
│ bar    │     (route outlet)         │
│        │                            │
│ - Dash │                            │
│ - Proj │                            │
│ - Set  │                            │
│        │                            │
├────────┴────────────────────────────┤
```

- Sidebar collapses on mobile (hamburger menu)
- Responsive: mobile-first
- Dark/light mode support via Tailwind

### shadcn/ui components to install
Button, Input, Label, Card, Dialog, DropdownMenu, Toast/Sonner, Avatar, Badge, Separator, Sheet (mobile sidebar), Skeleton (loading states)

## Acceptance Criteria
- [ ] Vite dev server starts and serves the React app
- [ ] Tailwind CSS classes work with shadcn/ui components
- [ ] Login page renders with email/password form and OAuth buttons
- [ ] Registration page with validation (email format, password requirements)
- [ ] MFA page accepts 6-digit TOTP code
- [ ] Forgot/reset password flow works
- [ ] Successful login stores token and redirects to dashboard
- [ ] Protected routes redirect to login when unauthenticated
- [ ] App shell renders sidebar + header + content area
- [ ] Sidebar navigation works (Dashboard, Projects, Settings)
- [ ] API client handles token refresh on 401
- [ ] Responsive: sidebar collapses on mobile
- [ ] Loading states show skeleton components
- [ ] Toast notifications for success/error feedback
- [ ] WCAG 2.1 AA: keyboard navigable, proper ARIA labels, contrast ratios
- [ ] Unit tests cover component logic, auth state management, and API client utilities
