# MVP-022: Frontend — App Shell & Auth Pages

## Description
Initialize the React app with Vite, Tailwind CSS, shadcn/ui, routing, the app shell (sidebar, header), and authentication pages (login, register, OAuth, MFA, forgot password).

## Personas
- **Priya (Frontend)**: Clean React setup with good DX
- **Finn (Onboarding)**: Auth pages must be simple and inviting
- **Lena (UX)**: Consistent layout, accessible components
- **Ava (Visual Designer)**: Clean, polished auth pages and app shell — typography, spacing, color palette foundation

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

### HTML Mockup Reference
Per the [HTML mockup review](../../meetings/2026-03-29-html-mockup-review.md):
- **Login desktop** (from `auth-desktop-dark.html`): split layout — left brand panel with gradient (`linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #7c3aed 100%)`), TF logo, hero text ("The architect of your digital workflow"), social proof ("2,400+ Teams"); right panel with email/password form, social auth (Google + GitHub), "Forgot password?" link, "Create workspace" link, footer legal links
- **Login mobile** (from `auth-mobile-dark.html`): full-width form with bottom tab navigation (Sign In / Join / Help), glassmorphism panel
- **Form inputs**: use `surface-container-high` background, `rounded-xl`, `pl-12` for icon-prefixed inputs, `focus:ring-2 focus:ring-primary`
- **Social auth buttons**: Google (inline SVG, not external image) + GitHub (SVG mark, not Material Symbol `terminal`)
- **Primary CTA**: gradient button pattern from design system

**Approved elements**: Split layout, brand gradient panel, hero text, social proof, form structure, social auth button pattern, mobile tab navigation.

**Missing from drafts** (build from spec): Registration page, MFA page, forgot/reset password pages, verify email page, light mode desktop auth.

## Acceptance Criteria
- [x] Vite dev server starts and serves the React app
- [x] Tailwind CSS classes work with shadcn/ui components
- [x] Login page renders with email/password form and OAuth buttons
- [x] Login page uses split layout (brand panel left, form right, form-only on mobile)
- [x] Brand panel shows TF Monogram logo, hero text, and social proof element
- [x] Brand panel uses gradient background from styleguide
- [x] Mobile login uses full-width form with tab navigation (Sign In / Join / Help)
- [x] Social auth buttons use inline SVGs (Google logo, GitHub mark), not external images
- [x] Registration page with validation (email format, password requirements)
- [x] Password strength indicator on registration (colored bar: red → amber → green)
- [x] Password requirements checklist visible before user types (grey unchecked, green checked)
- [x] MFA page accepts 6-digit TOTP code
- [x] Forgot/reset password flow works
- [x] Successful login stores token and redirects to dashboard
- [x] Protected routes redirect to login when unauthenticated
- [x] App shell renders sidebar + header + content area
- [x] Dark mode toggle in user menu (persisted, respects system preference)
- [x] Sidebar navigation works (Dashboard, Projects, Settings)
- [x] API client handles token refresh on 401
- [x] Responsive: sidebar collapses on mobile (Sheet component)
- [x] Loading states show skeleton components — deferred to MVP-027
- [x] Toast notifications for success/error feedback (Sonner)
- [x] Skip-to-content link for accessibility
- [x] manifest.json with app metadata (name, icons, theme-color)
- [x] Route-level `<title>` tags (e.g., "Dashboard | TaskForge") — `useDocumentTitle` hook
- [x] All components use design tokens, no hardcoded hex colors
- [x] WCAG 2.1 AA: keyboard navigable, proper ARIA labels, contrast ratios
- [x] Unit tests cover component logic, auth state management, and API client utilities
