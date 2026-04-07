# Security Review Meeting — 2026-03-29

## Attendees
- **Nadia (Security Expert)** — Application Security Engineer
- **Marcus (Backend Developer)** — Backend API developer
- **Hana (Compliance Auditor)** — Compliance Officer (SOC 2/HIPAA)

---

## Agenda
Review ~25 security concerns identified across the TaskForge API codebase, categorized by severity, and decide on remediation for each.

---

## 1. CRITICAL: Broken Object-Level Authorization (BOLA) in Bulk Actions

**File:** `bulk.routes.ts`, `bulk.service.ts`

**Nadia:** This is textbook BOLA (OWASP API Security #1). The bulk endpoint only has `fastify.authenticate` — any authenticated user who guesses task UUIDs can modify or delete tasks in any organization. The service fetches tasks by ID with no project membership filter.

**Marcus:** The `authorize` hook exists and works well on other routes. We just missed adding it here. The challenge is that bulk actions span multiple tasks potentially across projects. We need to verify the caller has membership in every project involved.

**Hana:** This is a SOC 2 control failure — access controls must be enforced consistently. Audit logs currently record the action but don't prove the actor was authorized.

**Decision:** Add `authorize` hook to bulk routes. In the service, validate that ALL tasks belong to projects the caller is a member of before executing any action. Fail the entire batch if any task is unauthorized — don't allow partial success on authorization failures (partial success is fine for other errors).

---

## 2. CRITICAL: Missing Authorization on Attachment Upload

**File:** `attachments.routes.ts`

**Nadia:** The upload route (`POST /api/v1/attachments`) has `requireFeature('file_uploads')` but NO `authorize` hook. Every other attachment route has proper authorization. This means any authenticated user can upload files to any task they have the ID for.

**Marcus:** Clear oversight — the pattern is right there on lines 30-41 (GET route) and 68-79 (DELETE route). We just need to copy the same `authorize({ resource: 'attachment', action: 'create', getTaskId: ... })` pattern.

**Decision:** Add `authorize` with `action: 'create'` and `getTaskId` extraction to the upload route preHandler array.

---

## 3. CRITICAL: Realtime Channel ACL Bypass

**Files:** `gateway.ts`, `sse.ts`, `channels.ts`

**Nadia:** Both WebSocket and SSE accept arbitrary channel subscriptions. The only validation is a regex format check (`/^(project|user):[a-zA-Z0-9_-]+$/`). Any authenticated user can subscribe to `project:<anyProjectId>` and receive all real-time events for that project — task changes, comments, everything.

**Marcus:** We need an async membership check in the subscribe path. When a user requests `project:X`, we verify they're a member of project X. For `user:X`, we verify X matches their own userId.

**Nadia:** Also, `user:me` is resolved correctly, but there's nothing stopping someone from subscribing to `user:<otherUserId>` and seeing their notifications.

**Decision:**
- For `project:*` channels: verify project membership via DB query before subscribing
- For `user:*` channels: only allow subscribing to your own user channel (`user:<yourId>`)
- Apply the same validation in both WS gateway and SSE route
- Make `subscribe` in `channels.ts` an async function that performs the check, or add the check before calling `subscribe`

---

## 4. HIGH: Search Authorization Bypass + Meilisearch Filter Injection

**File:** `search.service.ts`, `search.handlers.ts`

**Nadia:** Two issues. First, when `projectId` is supplied as a query parameter, the service uses it directly in the Meilisearch filter — bypassing the accessible projects list it already computes. An attacker can search any project's data by passing its ID. Second, the filter is built via string interpolation: `projectId = "${projectId}"`. This is a filter injection vector — a crafted projectId like `" OR id != "` could alter the query semantics.

**Marcus:** The fix is straightforward: (1) When projectId is supplied, verify it exists in the accessible projects list. (2) Sanitize the projectId by validating it's a UUID format before interpolation, or better yet, check it against the accessible list and reject if not found.

**Decision:**
- Validate `projectId` is in the user's accessible projects list — return empty results if not
- Validate UUID format on projectId to prevent injection
- These two checks together eliminate both the authorization bypass and the injection vector

---

## 5. HIGH: Token Leakage in Logs

**Files:** `auth.service.ts` (lines 78, 270)

**Nadia:** Verification tokens and password reset tokens are logged in plaintext via `console.log`. These are the `TODO: Send email` placeholders. In any environment with log aggregation, these tokens are exposed to anyone with log access. An attacker with log access can verify accounts or reset passwords.

**Hana:** This violates our logging policy — credentials and tokens must never appear in application logs.

**Marcus:** These are dev placeholders. We should log that a token was generated but never the token itself. The TODO for email sending (MVP-018) should eventually replace these entirely.

**Decision:** Replace `console.log` calls with messages that indicate a token was generated but do NOT include the actual token value. Keep the TODO comments for MVP-018.

---

## 6. HIGH: Permissive Secret Fallbacks

**Files:** `auth.plugin.ts` (line 17), `cookie.plugin.ts` (line 7), `mfa.service.ts` (line 13)

**Nadia:** All three use the pattern `process.env.X ?? 'dev-...-change-in-production'`. If any of these env vars are missing in production, the app starts silently with a known, weak secret. JWT tokens become forgeable, cookies predictable, and TOTP secrets decryptable.

**Marcus:** We should throw a hard error in production if these secrets aren't set. In development, the fallback is convenient and acceptable.

**Hana:** SOC 2 requires that cryptographic keys are managed properly. Starting production with hardcoded keys is a finding.

**Decision:** Add production guards that throw on startup if `JWT_SECRET`, `COOKIE_SECRET`, or `MFA_ENCRYPTION_KEY` are not set when `NODE_ENV === 'production'`.

---

## 7. HIGH: Refresh Token Not Rotated

**File:** `auth.service.ts` (`refreshSession` function, lines 187-211)

**Nadia:** `refreshSession()` issues a new access token but keeps the same refresh token. If a refresh token is stolen, the attacker can use it indefinitely until it expires (7 days). Token rotation would limit the window — each use invalidates the old token and issues a new one.

**Marcus:** This requires updating the session's `tokenHash` in the DB and returning a new refresh token to the client. The client then uses the new refresh token on the next request.

**Decision:** Implement refresh token rotation: on each refresh, generate a new refresh token, update the session's tokenHash, and return the new token. The old refresh token becomes invalid immediately.

---

## 8. HIGH: Stale Access Tokens (No Session Validation)

**File:** `auth.plugin.ts` (`authenticate` hook, lines 72-84)

**Nadia:** The `authenticate` hook only verifies the JWT signature and expiry. It does not check whether the session (`payload.sid`) is still valid in the database. After logout or password change, already-issued access tokens remain valid for up to 15 minutes (their expiry window). This means `changePassword` and `logoutSession` don't truly take effect immediately.

**Marcus:** Checking the session table on every request adds a DB query per request. We could use Redis to cache session validity and invalidate the cache on logout. But for MVP, with 15-minute token expiry, this is a known trade-off.

**Nadia:** Given our 15-minute access token window, I can accept this as a **known risk for MVP** if we document it. But we should at minimum check session validity for sensitive operations (password change, MFA setup/disable).

**Decision:** **Defer to Phase 2.** Document this as a known risk. The 15-minute token window is an acceptable trade-off for MVP. Consider Redis-backed session validation in Phase 2.

---

## 9. MEDIUM: Saved Filter Organization Bypass

**Files:** `saved-filters.routes.ts`, `saved-filter.service.ts`

**Nadia:** The saved filter routes only have `fastify.authenticate`. There's no `authorize` hook checking org membership. The list endpoint takes `orgId` from route params and passes it to the service, which filters by `userId + organizationId` — so a user can only see their own filters. But the create endpoint accepts `orgId` from params without verifying the user is a member of that org.

**Marcus:** The userId check mostly protects this — you can only list/update/delete your own filters. But creating a filter for an org you don't belong to is wrong. We should add org membership verification on create and list.

**Decision:** Add `authorize` hook with `resource: 'saved_filter'` to the create and list routes. This ensures org membership is verified. Update/delete are already protected by userId ownership checks.

---

## 10. MEDIUM: Wrong Actor ID in Activity Log

**File:** `project.service.ts` (lines 421, 481)

**Nadia:** `addProjectMember` logs `actorId: userId` — where `userId` is the new member being added, not the person who performed the action. Same issue in `updateProjectMember` where `actorId: member.userId` logs the member being modified, not the admin who changed the role.

**Hana:** This breaks the audit trail. We need to know WHO performed the action, not who was affected.

**Marcus:** The service functions don't receive an `actorId` parameter. The route handlers need to pass `request.authUser.userId` as the actor.

**Decision:** Add an `actorId` parameter to `addProjectMember` and `updateProjectMember`. Route handlers must pass the authenticated user's ID. Update the activity log calls to use this parameter.

---

## 11. MEDIUM: WebSocket Auth Token in URL Query String

**File:** `gateway.ts` (line 63)

**Nadia:** WS auth uses `url.searchParams.get('token')`. Tokens in URLs appear in browser history, server access logs, proxy logs, and monitoring. This is a well-known risk from the OAuth implicit flow era.

**Marcus:** WebSocket doesn't support custom headers on the initial handshake from browsers. The alternatives are: (1) short-lived WS-specific ticket obtained via authenticated REST call, (2) auth via the first message after connection. Option 1 is more secure — issue a single-use ticket with 30s TTL, verify on WS connect.

**Nadia:** Both are better than putting the JWT in the URL. The ticket approach is standard.

**Decision:** **Defer to Phase 2.** Document this as a known risk. The current approach works for MVP. In Phase 2, implement a ticket-based auth flow: `POST /api/v1/auth/ws-ticket` returns a single-use ticket, WS connects with the ticket instead of the JWT.

---

## 12. MEDIUM: OAuth Callback URL Trusts Request Host

**File:** `oauth.handlers.ts` (line 25)

**Nadia:** The callback URL is built from `request.hostname` and `request.protocol`. Behind a reverse proxy without proper `X-Forwarded-Host` headers, or in a host-header injection attack, this could redirect the OAuth flow to an attacker-controlled domain with the auth code.

**Marcus:** We should use a configured `API_BASE_URL` env var instead of deriving from the request. This is more reliable and not susceptible to host header manipulation.

**Decision:** Use `process.env.API_BASE_URL` (or fall back to `FRONTEND_URL`-derived value) for the callback URL instead of building it from the request. The callback URL stored in Redis state already provides replay protection.

---

## 13. MEDIUM: OAuth Provider Access Tokens Stored Plaintext

**File:** `oauth.service.ts` (lines 251-253, 278-286, 317-325)

**Nadia:** Provider access tokens (Google, GitHub) are stored in the `oauthAccounts` table as plaintext. These tokens grant access to the user's data on the provider's platform.

**Marcus:** We could encrypt them the same way we encrypt TOTP secrets. But do we actually use these tokens after the initial user info fetch? Looking at the code, we only use them during the OAuth callback to fetch user info. After that, we don't call the provider APIs again.

**Nadia:** If we don't need them, we shouldn't store them. If we do need them for future features (like GitHub integration), encrypt them.

**Decision:** **For MVP, stop storing the provider access token.** We only need it during the callback to fetch user info, which we do immediately. If a future feature needs ongoing provider API access, implement encrypted storage at that time. For now, update existing records on re-auth but with a null/empty value.

---

## 14. MEDIUM: CSRF on Cookie-Auth Endpoints

**Nadia:** The refresh token is stored in an httpOnly cookie with `sameSite: 'lax'`. Lax SameSite provides decent CSRF protection for POST requests (they're blocked cross-origin). The cookie is also scoped to `path: '/api/v1/auth'`. For MVP, this is acceptable.

**Marcus:** Adding a CSRF token would require the frontend to fetch and include it, adding complexity. With Lax SameSite + httpOnly + secure (in prod), the risk is low.

**Decision:** **Acceptable for MVP.** SameSite=Lax on POST provides sufficient CSRF protection. Consider adding CSRF tokens in Phase 2 if we add more cookie-dependent endpoints.

---

## 15. LOW: Request URL Logging May Include Tokens

**File:** `on-request.hook.ts` (line 14)

**Nadia:** The on-request hook logs `request.url`. For WebSocket upgrade requests with tokens in query strings, this could log the JWT. However, looking at the code, the WS route is handled via the `@fastify/websocket` plugin which may not trigger the standard HTTP request logging.

**Marcus:** Fastify's websocket plugin does go through the HTTP upgrade path, so the initial request IS logged. We should strip sensitive query params before logging.

**Decision:** Sanitize the URL in the logging hook by stripping `token` query parameters before logging. This is a defense-in-depth measure.

---

## 16. Role Validation in Project Service

**File:** `project.service.ts` (lines 396-404, 468-474)

**Nadia:** When adding or updating a project member's role, the code verifies the role exists but doesn't check that the role belongs to the correct organization. A user could theoretically assign a role from another organization.

**Marcus:** Roles are scoped to organizations via the `roles.organizationId` column. We should add an org check when validating the role.

**Decision:** Add organization check when validating roleId — ensure the role belongs to the same org as the project.

---

## Summary of Decisions

| # | Issue | Severity | Decision |
|---|-------|----------|----------|
| 1 | BOLA in bulk actions | CRITICAL | **Fix now** — add authorize hook + project membership validation |
| 2 | Missing auth on upload | CRITICAL | **Fix now** — add authorize hook |
| 3 | Realtime channel ACL | CRITICAL | **Fix now** — verify membership before subscribe |
| 4 | Search authz bypass + injection | HIGH | **Fix now** — validate projectId + UUID format |
| 5 | Token leakage in logs | HIGH | **Fix now** — remove token values from logs |
| 6 | Permissive secret fallbacks | HIGH | **Fix now** — throw in production |
| 7 | Refresh token not rotated | HIGH | **Fix now** — implement rotation |
| 8 | Stale access tokens | HIGH | **Defer to Phase 2** — acceptable with 15-min expiry |
| 9 | Saved filter org bypass | MEDIUM | **Fix now** — add authorize hook |
| 10 | Wrong actor ID in activity log | MEDIUM | **Fix now** — pass actorId parameter |
| 11 | WS token in URL | MEDIUM | **Defer to Phase 2** — implement ticket-based auth |
| 12 | OAuth callback URL | MEDIUM | **Fix now** — use configured base URL |
| 13 | OAuth tokens stored plaintext | MEDIUM | **Fix now** — stop storing provider tokens |
| 14 | CSRF on cookie endpoints | LOW | **Acceptable for MVP** — SameSite=Lax sufficient |
| 15 | URL logging with tokens | LOW | **Fix now** — sanitize URL before logging |
| 16 | Role org validation | MEDIUM | **Fix now** — add org check |
