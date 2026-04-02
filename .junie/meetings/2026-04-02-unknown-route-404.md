# Meeting: Auth-Aware Unknown Route UX (404)

**Date**: 2026-04-02  
**Attendees**: Sarah (PM), Lena (UX), Priya (Frontend), Anil (QA), Nadia (Accessibility)

## Context
Define the behavior for non-registered routes in the web app for both anonymous and authenticated users.

## Discussion

### Sarah (PM)
- Unknown routes must not leak internal layout to anonymous users.
- Recovery should be immediate and deterministic.

### Lena (UX)
- Authenticated users should remain in the familiar app frame.
- The empty-state should be calm and clear, with a direct path back to work.

### Priya (Frontend)
- Use router-level not-found handling instead of a wildcard route per section.
- Keep logic centralized and testable.

### Anil (QA)
- Redirect payload must preserve full attempted URL so post-login recovery is exact.
- Add test coverage for both auth states and unknown routes.

### Nadia (Accessibility)
- Keep semantic heading, readable body text, and keyboard-focusable primary action.

## Decisions
1. For unknown routes while logged out, redirect to `/auth/login` with `redirect` set to the full attempted URL (`pathname + search + hash`).
2. For unknown routes while logged in, keep app shell visible and render an in-app not-found page in main content.
3. Add a primary CTA labeled `Go to dashboard`.
4. Implement with TanStack Router global not-found fallback, routing authenticated users to `/not-found`.
5. Use replace-navigation for fallback redirects to avoid confusing back-stack behavior.

## Acceptance Notes
- No backend changes.
- No API contract changes.
- Frontend route table and UI only.
