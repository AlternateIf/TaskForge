# Frontend Kickoff Follow-Up Meeting — 2026-03-30

**Context:** The original kickoff (2026-03-27) specified this sync should happen after MVP-041 (design system) is implemented to review component quality before building views. MVP-042 (rich text editor) and MVP-043 (command palette) are also now complete.

## Attendees
- **Lena** (UX Expert) — quality gate: accessibility, usability, layout correctness
- **Ava** (Visual Designer) — design fidelity, token gaps, visual polish
- **Priya** (Frontend Developer) — implementation readiness, missing dependencies
- **Sarah** (PM) — feature ordering, sprint planning
- **Marcus** (Backend Developer) — API readiness, integration concerns
- **Kai** (Performance Engineer) — bundle impact, dependency choices
- **Derek** (Workfront Migrator) — power-user perspective

---

## 1. Design System Review (MVP-041)

### 1.1 Token Coverage

**Ava:** I've reviewed the `globals.css` against our token spec from the kickoff. The implementation is thorough — all color tokens, typography scale, spacing grid, shadow levels 1–4, border radius, transitions, and app shell dimensions are present and correctly defined. Dark mode swaps correctly under `.dark`. ✅

One discrepancy: the MVP-043 command palette uses `border-outline-variant/15` — but `outline-variant` is not a defined token. The closest existing token is `border-ghost` (which is already `rgba(195, 198, 215, 0.15)` — exactly the intended value). The command palette must be corrected to use `border-border-ghost` instead.

**Priya:** Agreed. I'll fix that before we go further. It won't affect tests since jsdom doesn't validate token resolution, but it would produce no border in the actual app.

**Decision:** Fix `border-outline-variant/15` → `border-border-ghost` in `command-palette.tsx` as a prerequisite before starting MVP-022.

### 1.2 Component Quality

**Lena:** I'm satisfied with the component inventory: Button (5 variants), Input, Dialog (with focus trap and Escape), Card, Avatar, Badge, Skeleton, Toast, Tooltip, Dropdown, Tabs, Separator, Checkbox, Switch, Progress, Table, Textarea, Label. All built without Radix or cmdk — consistent with the hand-rolled pattern. Focus ring is globally defined via `:focus-visible`. ✅

**Ava:** The gradient primary button, GlassPanel, CommentBubble, MetadataLabel, FileDropzone, and PriorityBadge components are all present from the MVP-041 scope. Skip-to-content link is in `App.tsx`. `manifest.json` is correct. ✅

**Kai:** Font loading is `font-display: swap`, Inter variable font with a good unicode subset. `prefers-reduced-motion` sets all durations to 0ms. The build outputs CSS — haven't profiled the gzipped size yet, but token-only CSS should be well under 30KB. ✅

**Conclusion: MVP-041 passes the quality gate.** We can proceed to view development.

---

## 2. Missing Dependencies for View Development

**Priya:** Before we can build MVP-022 (App Shell & Auth), two critical dependencies are not yet in `package.json`:

1. **Router** — no router installed. The kickoff spec mentions TanStack Router or React Router. The command palette's `onNavigate` currently has nowhere to route.
2. **TanStack Query** — no data-fetching layer. Every view needs it.

Without these, MVP-022 cannot be started.

### 2.1 Router Choice

**Priya:** TanStack Router vs. React Router v7.

- **TanStack Router**: type-safe routes with file-based routing support, deeply integrated with TanStack Query, excellent DX for our TypeScript-first codebase, built-in loader pattern for route-level data fetching.
- **React Router v7**: familiar, simpler mental model, massive ecosystem. Less type-safe out of the box.

My preference: TanStack Router. The type safety and query integration are worth it.

**Marcus:** Either works from the API side. My only ask: the route params and search params must be typed — I don't want `string | undefined` everywhere. TanStack Router does this correctly.

**Derek:** In Workfront, deep-linking to specific tasks/projects via URL was essential for sharing. TanStack Router's URL state management sounds better for that.

**Kai:** TanStack Router + TanStack Query together are ~40KB gzipped. That's significant given our 200KB initial bundle budget. But we can tree-shake and code-split aggressively — route-level lazy loading is the standard pattern.

**Decision: TanStack Router + TanStack Query.** Both go into `package.json` before MVP-022.

### 2.2 Additional Missing Packages for MVP-022

**Priya:** For MVP-022 specifically, we also need:
- `sonner` — toast notifications (we have the `toast.tsx` primitive but Sonner is the recommended provider)
- `@tanstack/router-devtools` (dev only)
- `zod` — likely already in shared, but needs to be available in web for form validation

**Priya:** We do NOT need to add anything for the auth API calls yet — the API client in `src/api/client.ts` will be hand-written (fetch wrapper) per the spec, no extra library needed.

---

## 3. Implementation Order

**Sarah:** What's the order for MVP-022 through MVP-028? I want to know which views become available to test soonest.

**Priya:** Dependencies are linear in places:

```
MVP-022 (App Shell + Auth) ← required by all frontend views
    ↓
MVP-023 (Projects, Kanban, List views)
MVP-025 (Dashboard, Search, Notifications)
    ↓ (parallel after 022)
MVP-024 (Task Detail) ← depends on tasks being visible (023)
MVP-026 (Keyboard Shortcuts overlay) ← standalone, can go anytime after 022
MVP-027 (Onboarding) ← depends on shell + auth (022) and projects (023)
MVP-028 (Real-time) ← final layer, wraps everything
```

**Marcus:** MVP-022 needs the auth API (001–010) which is marked ✅ in the roadmap. MVP-023 needs the project/task API (011–015) which is also ✅. MVP-025 (search/notifications) needs MVP-019 and MVP-020, both ✅. The backend is ready. The frontend is the bottleneck.

**Decision: Start with MVP-022 immediately.** Then MVP-023 and MVP-025 in parallel once the shell is stable. MVP-024 follows 023. MVP-026 can be implemented alongside any of these as a standalone component. MVP-027 and MVP-028 are last.

---

## 4. Specifics for MVP-022

**Priya:** The biggest architectural decisions for MVP-022:

**4.1 Router file structure:**
TanStack Router with file-based routing (`apps/web/src/routes/`). Route files use `createFileRoute()`. The root route renders the app shell. Auth routes are at `/auth/*` (unauthenticated layout). All other routes are protected.

**Lena:** The protected route logic must handle the loading state — don't flash the login page while checking auth. Show a skeleton or spinner.

**Finn (via Lena):** The auth split layout (brand panel left, form right) is critical. Don't cut that to save time.

**4.2 Auth state:**
Zustand for client auth state (`isAuthenticated`, `user`, `token`). Token in `localStorage`, auto-loaded on app start. On 401, attempt refresh — on failure, clear state and redirect.

**Kai:** Zustand is ~3KB gzipped. Acceptable. Don't use Context + useReducer — it will cause unnecessary re-renders at scale.

**Nadia (flagged, not attending):** From the security review notes: `HttpOnly` cookies are the proper token storage — `localStorage` is vulnerable to XSS. However, the API currently uses JWT Bearer tokens, not cookies. This is flagged as a Phase 2 security hardening item. For MVP, `localStorage` is acceptable with the understanding that this will be replaced.

**Decision:** Zustand for auth state, `localStorage` for token, with Phase 2 migration to `HttpOnly` cookies acknowledged.

**4.3 Dark mode toggle:**
Already handled by `ThemeProvider` (from MVP-041). The header's user menu just calls `toggleTheme()` from the provider context. Nothing additional needed in MVP-022 beyond wiring the button.

**4.4 Missing items from MVP-022 gap list (kickoff §13):**
- Dark mode toggle in user menu ← handled by ThemeProvider
- Password strength indicator on register ← must be implemented in register.tsx
- Skip-to-content link ← already in App.tsx ✅

---

## 5. Performance Gate

**Kai:** Before we can ship MVP-022, the CI bundle size check must pass. Currently the CI pipeline has a 500KB gzipped limit with a 250KB warning threshold. With TanStack Router + TanStack Query + Zustand + current components, the initial bundle will need aggressive code-splitting.

**Requirements for MVP-022:**
- All routes lazy-loaded via `React.lazy` (TanStack Router's default with file-based routing)
- Tiptap NOT loaded on initial route — lazy-load only when user opens a task description editor
- The command palette's `onSearch` callback lazy-loads the search API client
- Rich text editor lazy-loads on first editor interaction

**Kai:** Target: initial JS chunk under 150KB gzipped after MVP-022. The remaining 50KB budget is reserved for downstream features.

---

## 6. Open Questions and Blockers

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | Fix `border-outline-variant/15` in command palette | Priya | Must fix before MVP-022 |
| 2 | Install TanStack Router + TanStack Query + Zustand | Priya | First task in MVP-022 |
| 3 | TanStack Router file-based routing config in `vite.config.ts` | Priya | Needs `@tanstack/router-plugin/vite` |
| 4 | i18n: prep architecture now or defer? | Lena | **Defer** — no string map yet. MVP ships hardcoded English. i18n is Phase 2. |
| 5 | Keyboard shortcuts layer (MVP-026) — register `?` key globally | Priya | Can be done alongside 022. `useCommandPalette` pattern already established. |
| 6 | outline-variant token — add formally to globals.css? | Ava | **Yes** — add `--outline-variant` as alias for `--border` with 15% opacity variant. Prevents future confusion. |

**Decision on #6 (Ava):** Add `--outline-variant: rgba(var(--border-rgb), 0.15)` to `globals.css` and map to Tailwind. This way components using the Material Design naming convention from HTML drafts compile correctly. Fix command palette to use this token.

Actually: since Tailwind v4 allows `/opacity` modifiers on any color, and `border-border` resolves correctly — the simplest fix is `border-border/15`. That reads clearly and doesn't require a new token. Use that in command palette instead.

**Revised decision:** Fix command palette to `border-border/15`. No new token needed.

---

## 7. Go / No-Go

**Sarah:** Are we ready to start MVP-022?

| Check | Status |
|---|---|
| Design system (MVP-041) | ✅ Complete — passes quality gate |
| Rich text editor (MVP-042) | ✅ Complete |
| Command palette (MVP-043) | ✅ Complete (pending `border-outline-variant` fix) |
| Backend APIs (auth, projects, tasks, search, notifications, realtime) | ✅ All marked complete in roadmap |
| Router decision | ✅ TanStack Router |
| State management decision | ✅ Zustand + TanStack Query |
| Token gap fix (command palette) | ⚠️ Required before MVP-022 |
| Package installs | ⚠️ Required as first step of MVP-022 |

**Decision: GO.** Start MVP-022 immediately after fixing the token gap in the command palette. The frontend foundation is solid and backend is ready.

---

## Action Items

| Owner | Action |
|---|---|
| Priya | Fix `border-outline-variant/15` → `border-border/15` in `command-palette.tsx` |
| Priya | Begin MVP-022: install TanStack Router, TanStack Query, Zustand, Sonner |
| Priya | Set up TanStack Router file-based routing with app shell + auth layout |
| Priya | Implement auth pages per MVP-022 spec and HTML mockup reference |
| Lena | Review MVP-022 auth pages for accessibility before merge |
| Ava | Review MVP-022 auth pages for visual fidelity (split layout, gradient panel) |
| Kai | Run first bundle size report after TanStack Router/Query are installed |
