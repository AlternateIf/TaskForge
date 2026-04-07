# Pre-Frontend All-Hands Review

**Date:** 2026-03-26
**Type:** All-hands review meeting
**Attendees:** Sarah (PM), Marcus (Backend), Priya (Frontend), Lena (UX), Ava (Visual Design), Anil (QA), Tara (Unit Tests), Sam (DevOps), Dana (Systems), Nadia (Security), Hana (Compliance), Omar (Integration), Niko (SCM), Jordan (Team Lead), Rosa (People Manager), Claire (Executive), Yuki (Freelancer), Elena (Customer), Finn (Onboarding), Victor (Sales), Mira (Dashboard), Tomás (Evaluation), Derek (Workfront Migrator), Kai (Performance), Raj (SEO)

---

## 1. Progress Report

### Backend MVP: 100% Complete (MVP-001 through MVP-021)

| # | Feature | Status |
|---|---------|--------|
| MVP-001 | Monorepo Setup | ✅ Done |
| MVP-002 | Docker Compose | ✅ Done |
| MVP-003 | CI Pipeline | ✅ Done |
| MVP-004 | Database Schema | ✅ Done |
| MVP-005 | API Server Foundation | ✅ Done |
| MVP-006 | Auth — JWT | ✅ Done |
| MVP-007 | Auth — OAuth | ✅ Done |
| MVP-008 | Auth — MFA (TOTP) | ✅ Done |
| MVP-009 | Organizations & Membership | ✅ Done |
| MVP-010 | Roles & Permissions | ✅ Done |
| MVP-011 | Projects | ✅ Done |
| MVP-012 | Tasks — CRUD | ✅ Done |
| MVP-013 | Subtasks & Checklists | ✅ Done |
| MVP-014 | Task Dependencies | ✅ Done |
| MVP-015 | Bulk Actions & Undo | ✅ Done |
| MVP-016 | File Uploads | ✅ Done |
| MVP-017 | Comments & Activity Log | ✅ Done |
| MVP-018 | RabbitMQ & Worker | ✅ Done |
| MVP-019 | Search & Filtering | ✅ Done |
| MVP-020 | Notifications | ✅ Done |
| MVP-021 | Real-Time Updates | ✅ Done |
| MVP-031 | Auto-Create GitHub Issues | ✅ Done |

### Remaining MVP (13 features):

| # | Feature | Category |
|---|---------|----------|
| MVP-022 | Frontend — App Shell & Auth | Frontend |
| MVP-023 | Frontend — Projects & Views | Frontend |
| MVP-024 | Frontend — Task Detail & Comments | Frontend |
| MVP-025 | Frontend — Search, Notifications, Dashboard | Frontend |
| MVP-026 | Frontend — Keyboard Shortcuts | Frontend |
| MVP-027 | Frontend — Onboarding & Sample Project | Frontend |
| MVP-028 | Frontend — Real-Time Integration | Frontend |
| MVP-029 | Monitoring — Prometheus & Grafana | Infra |
| MVP-030 | GitHub Release Workflow | DevOps |
| MVP-032 | Admin Auth Configuration | Backend |

**Sarah (PM):** "Excellent progress on the backend. Every API endpoint we need is in place. The question now is: before we dive into frontend, are we missing any backend work that the frontend will depend on?"

**Marcus (Backend):** "The API surface is solid. We have full CRUD for all entities, WebSocket/SSE for real-time, search, notifications — the frontend has everything it needs to build against. I'd recommend we focus on a few hardening items before frontend goes live though."

---

## 2. Agenda Item: Feature Customizability (Toggling Features On/Off)

**Finn (Onboarding):** "New users are overwhelmed when everything is on by default. If an organization doesn't use notifications or time tracking, those should be hideable."

**Sarah (PM):** "Agreed. We need org-level feature flags. An admin should be able to disable notifications, file uploads, search — anything that's optional."

**Jordan (Team Lead):** "This should be a backend feature with a simple key-value store. The frontend reads enabled features and hides UI accordingly."

**Marcus (Backend):** "We can add an `organization_settings` table or a JSONB column on the organizations table. Keys like `features.notifications.enabled`, `features.file_uploads.enabled`, etc. The API returns enabled features and the frontend conditionally renders."

**Nadia (Security):** "Feature toggles should be admin-only. No escalation — a team member can't re-enable something an admin disabled."

### Decision

- **MVP scope?** YES — this is lightweight and critical for onboarding and enterprise adoption.
- **Action:** Create **MVP-033: Organization Feature Toggles** — a settings endpoint that returns enabled features, with admin-only toggle API. Frontend reads this to conditionally render feature UI.

---

## 3. Agenda Item: Data Loss Prevention on Errors and Unexpected Shutdowns

**Dana (Systems):** "Power outages, OOM kills, container crashes — we need to ensure no data is silently lost."

**Marcus (Backend):** "Here's our current state:
- **RabbitMQ:** Queues are durable, messages are persistent (`persistent: true`), and we use publisher confirms. If the server crashes mid-publish, the message isn't acked so it stays in the queue. Dead-letter queues catch repeated failures.
- **Database:** MariaDB with InnoDB — ACID transactions by default. Writes are crash-safe.
- **Redis:** Used for caching and pub/sub only, not as source of truth. Loss of Redis data means temporary cache misses and missed real-time events, but no permanent data loss.
- **Undo tokens:** Stored in-memory, lost on crash. But these are ephemeral by design (30s TTL)."

**Sam (DevOps):** "Docker volumes are persistent. MariaDB and RabbitMQ data survive container restarts. But we should ensure:
1. WAL (Write-Ahead Logging) / binary logging is on for MariaDB so we can do point-in-time recovery.
2. RabbitMQ has a quorum queue option for HA — worth considering for production.
3. File uploads are on local disk — if the container dies, uploads are lost unless mounted to a persistent volume."

**Hana (Compliance):** "We need a backup strategy. Nightly database dumps at minimum. For GDPR compliance later, backups need to be encrypted."

**Kai (Performance):** "The worker's graceful shutdown already waits 30s for in-progress messages. That's good. But if the process is killed with SIGKILL (OOM), messages being processed are lost. The consumer should use manual ack only after success — which it already does."

### Decision

- **MVP scope?** PARTIAL — the fundamentals (durable queues, ACID DB, persistent volumes) are already in place. Backup strategy and upload persistence are operational concerns.
- **Action:**
  - Add documentation for production deployment (backup schedules, volume mounts) — part of MVP-030 release workflow.
  - Ensure file uploads use a persistent volume mount in Docker — update docker-compose.yml.
  - Quorum queues and DB replication are Phase 3 (Enterprise & Scale) concerns.
  - No new MVP feature needed — existing infrastructure handles this.

---

## 4. Agenda Item: Environment Variable Configurability

**Sam (DevOps):** "I audited every `process.env` reference in the codebase. Several variables are used in code but missing from `.env.example`:"

| Variable | Used In | Missing from .env.example |
|----------|---------|---------------------------|
| `HOST` | server.ts | Yes |
| `APP_URL` | deadline-reminder.handler.ts | Yes |
| `FRONTEND_URL` | oauth.service.ts | Yes |
| `CORS_ORIGIN` | cors.plugin.ts | Yes |
| `COOKIE_SECRET` | cookie.plugin.ts | Yes |
| `MFA_ENCRYPTION_KEY` | mfa.service.ts | Yes |
| `SMTP_USER` | email.service.ts | Yes |
| `SMTP_PASS` | email.service.ts | Yes |
| `EMAIL_FROM` | email.service.ts | Yes |
| `UPLOAD_DIR` | attachment.service.ts | Yes |
| `MAX_UPLOAD_SIZE_BYTES` | multipart.plugin.ts | Yes |
| `LOG_LEVEL` | logger.ts | Yes |
| `MEILISEARCH_API_KEY` | health.handlers.ts | Yes |
| `OAUTH_GOOGLE_CLIENT_ID` | oauth.service.ts | Yes |
| `OAUTH_GOOGLE_CLIENT_SECRET` | oauth.service.ts | Yes |
| `OAUTH_GITHUB_CLIENT_ID` | oauth.service.ts | Yes |
| `OAUTH_GITHUB_CLIENT_SECRET` | oauth.service.ts | Yes |

**Sam (DevOps):** "All service URLs (RabbitMQ, Redis, Meilisearch, MariaDB) already support full URL configuration, so connecting to managed/cloud instances (CloudAMQP, Redis Cloud, etc.) works out of the box. No code changes needed for external services."

**Marcus (Backend):** "We also need SMTP TLS support for production email providers. Currently `email.service.ts` creates a plain transport. We should add `SMTP_SECURE` and optionally `SMTP_TLS_REJECT_UNAUTHORIZED` env vars."

### Decision

- **MVP scope?** YES — updating `.env.example` is trivial but essential for deployment.
- **Action:** Create **MVP-034: Environment Configuration Hardening** — update `.env.example` with all variables, add SMTP TLS support, document all env vars.

---

## 5. Agenda Item: Load Handling and Bot Protection

**Nadia (Security):** "Current rate limiting is 20 req/min per IP globally. That's a starting point, but we need:
1. **Per-endpoint rate limits** — auth endpoints (login, register) should be much stricter (5/min) to prevent brute force.
2. **Bot detection** — automated signup and login abuse. CAPTCHA on registration and after N failed logins.
3. **IP reputation/blocking** — ability to block known bad IPs."

**Kai (Performance):** "20 req/min globally is too low for legitimate API consumers. Task listing, search, and real-time polling need higher limits. Auth endpoints should be lower."

**Omar (Integration):** "API consumers using personal access tokens (Phase 2) will need different rate limit tiers than browser users."

**Elena (Customer):** "As an external customer, if I refresh the page too many times I shouldn't get locked out. Rate limits should be reasonable for normal usage."

**Sarah (PM):** "For MVP, let's focus on what prevents abuse without over-engineering:
1. Differentiated rate limits per route group.
2. CAPTCHA on registration.
3. Account lockout after N failed login attempts."

**Nadia (Security):** "Account lockout is already partially handled — we track failed login attempts. We need to add a cooldown period and progressive delays."

### Decision

- **MVP scope?** YES for basic hardening; NO for full bot detection.
- **Action:** Create **MVP-035: Rate Limiting & Abuse Prevention** — per-route rate limits (strict on auth, relaxed on read endpoints), account lockout with progressive delay after failed logins. CAPTCHA and IP reputation are Phase 2.

---

## 6. Agenda Item: RabbitMQ Message Priorities

**Marcus (Backend):** "Currently all queues are equal. But real-time broadcast should be processed faster than search indexing, and email delivery is somewhere in between."

**Sam (DevOps):** "RabbitMQ supports priority queues natively via `x-max-priority`. But the simpler approach is separate queues with dedicated consumers, which we already have. The worker can run multiple consumer instances for high-priority queues."

**Marcus (Backend):** "Our current architecture already separates concerns:
- `realtime.broadcast` — needs to be fast (sub-second)
- `notification.create` — important but seconds are fine
- `email.send` — can tolerate minutes of delay
- `search.index` — background, lowest priority

The bottleneck isn't queue priority but consumer throughput. We can set different `prefetch` counts per queue."

**Kai (Performance):** "I'd recommend:
- `realtime.broadcast`: prefetch 10, processed by the API server (already happens via Redis pub/sub)
- `notification.create`: prefetch 5
- `email.send`: prefetch 3
- `search.index`: prefetch 1 (already the case, Meilisearch batches internally)"

### Decision

- **MVP scope?** YES — lightweight change to consumer prefetch per queue.
- **Action:** Create **MVP-036: Queue Priority Configuration** — configurable prefetch per queue, document priority strategy. No need for RabbitMQ priority queues at MVP scale.

---

## 7. Agenda Item: Internal Comments (Team-Only Visibility)

**Elena (Customer):** "I should only see comments meant for me. Internal team discussions about my task shouldn't be visible to me."

**Jordan (Team Lead):** "This is essential. We often discuss approach, timeline, or issues internally before responding to a customer."

**Sarah (PM):** "A simple `visibility` field on comments: `public` (default) or `internal`. Internal comments are filtered out when the requesting user has a Guest/Customer role."

**Marcus (Backend):** "Easy to implement. Add a `visibility` column to the comments table, default `public`. The comment listing query filters by role. Activity log entries for internal comments are also hidden from customers."

**Hana (Compliance):** "Audit trail should still capture internal comments — they're just not visible via the API to customers."

**Nadia (Security):** "Make sure the filter is applied at the service layer, not just the frontend. A customer shouldn't be able to fetch internal comments via the API even with the right comment ID."

### Decision

- **MVP scope?** YES — this is a critical privacy feature for customer-facing use.
- **Action:** Create **MVP-037: Internal Comments** — add `visibility` column (`public`/`internal`) to comments, filter by role at service layer, hide from activity log for customers.

---

## 8. Agenda Item: Stream-Safe Mode (Screen Sharing Privacy)

**Yuki (Freelancer):** "When I share my screen with a client, I need to hide billing rates, internal comments, and notes from other projects."

**Victor (Sales):** "Same for demos. We show the product but can't expose internal pricing, customer names from other accounts, or team discussions."

**Sarah (PM):** "This is a frontend concern. A toggle in the UI that:
1. Hides internal comments
2. Blurs or hides sensitive fields (prices, billing rates — Phase 2 features)
3. Restricts the view to the current project context
4. Shows a visual indicator that stream-safe mode is active"

**Priya (Frontend):** "This is a CSS overlay + context provider. When active, certain components render redacted. No backend changes needed — the frontend already knows which comments are internal (from the visibility field) and which fields are sensitive."

**Lena (UX):** "The toggle should be easily accessible — keyboard shortcut and toolbar button. It should be obvious to the user that it's active (colored border or banner)."

### Decision

- **MVP scope?** NO — this is a frontend-only UX feature that depends on internal comments and doesn't block core functionality. It also becomes more valuable when billing/pricing features exist (Phase 2).
- **Action:** Add to **Phase 2 roadmap** under a new "Privacy & Presentation" section.

---

## 9. Agenda Item: Logging Strategy — Database vs. File Logs

**Dana (Systems):** "Currently, structured application logs go to stdout via Pino (picked up by Docker/Loki). Business-level activity (task changes, comments, permission changes) is stored in the `activity_log` table."

**Marcus (Backend):** "The activity_log table is append-only with indexes on entity, org, actor, and timestamp. At MVP scale this is fine. But long-term, this table will grow fast — every task update, comment, status change creates a row."

**Kai (Performance):** "Concerns:
1. The activity_log table will be the fastest-growing table. We need a retention policy or archival strategy.
2. Application logs (request/response, errors) should NOT go to the database — stdout + Loki is the right approach.
3. Audit logs (compliance) should be separate from activity logs (user-facing)."

**Hana (Compliance):** "Audit logs must be immutable and retained for a configurable period. Activity logs can be archived after 90 days. These are different concerns."

**Sam (DevOps):** "Current setup is actually solid:
- **Application logs:** Pino → stdout → Loki (via Promtail). Searchable, time-bounded, doesn't touch DB.
- **Activity logs:** Database table. Correct for user-facing features (activity feed).
- **Missing:** Dedicated audit log for compliance (separate from activity_log). This is Phase 3."

**Marcus (Backend):** "For MVP, the activity_log table is fine. We should add a note about retention in the production deployment docs. The table has proper indexes for all query patterns."

### Decision

- **MVP scope?** NO for changes — current logging strategy is correct.
- **Action:**
  - Document the logging architecture in deployment docs.
  - Add activity_log retention/archival to Phase 3 (Compliance & Audit).
  - No changes to current implementation needed.

---

## 10. Agenda Item: Database Indexes

**Kai (Performance):** "I reviewed all schema files. We have 40+ indexes across all tables. Coverage is comprehensive:"

**Well-indexed patterns:**
- User lookups by email, session token, OAuth provider
- Tasks by project+status (composite), assignee, due date, parent
- Comments by entity (type+id), author, parent (threading)
- Notifications by user+readAt and user+createdAt (pagination)
- Activity log by entity, org, actor, createdAt
- Attachments by entity
- Project members by project and user
- Org members by org and user

**Kai (Performance):** "The indexes align with our query patterns. I don't see any missing indexes for MVP queries. The only future concern is the activity_log table needing a composite index on `(entityType, entityId, createdAt)` for efficient paginated activity feeds, but the current single indexes handle current load."

**Marcus (Backend):** "Drizzle ORM generates proper MySQL indexes. MariaDB's query optimizer uses them well. We should add `EXPLAIN` analysis as part of our performance testing before going to production."

### Decision

- **MVP scope?** NO — indexes are already comprehensive.
- **Action:** No changes needed. Add performance testing with `EXPLAIN` to pre-production checklist.

---

## 11. Additional Items Raised During Discussion

### 11a. Session Invalidation on Password Change

**Nadia (Security):** "The roadmap lists 'Session invalidation on password change' as an MVP item but it's not checked off. Is this implemented?"

**Marcus (Backend):** "The password change endpoint exists but doesn't invalidate other sessions. We need to add that."

### Decision

- **MVP scope?** YES — already listed in roadmap. Needs implementation.
- **Action:** Create **MVP-038: Session Invalidation on Password Change** — when a user changes their password, invalidate all other active sessions (delete from sessions table, except current).

### 11b. User Profile Management

**Finn (Onboarding):** "Users can't update their display name or avatar. 'User profile management' is listed in the roadmap but unchecked."

### Decision

- **MVP scope?** YES — already listed in roadmap.
- **Action:** Create **MVP-039: User Profile Management** — PATCH endpoint for display name, avatar upload, account deletion request.

### 11c. Kanban & List View Backend Support

**Priya (Frontend):** "For the Kanban board, do we have the right API support? I need tasks grouped by status column with ordering."

**Marcus (Backend):** "Task listing already supports filtering by status and has a `position` field for ordering within a status column. The drag-and-drop reorder endpoint (PATCH `/tasks/:id/reorder`) already handles moving between status columns. The frontend has everything it needs."

### Decision

- No action needed — API already supports frontend view requirements.

### 11d. ETag / Cache-Control Headers

**Kai (Performance):** "The roadmap mentions 'ETag and Cache-Control support' as an MVP API item. This would reduce bandwidth significantly for polling clients."

**Marcus (Backend):** "Not yet implemented. For task lists and notification counts (the main polling targets), ETags would help."

### Decision

- **MVP scope?** YES — already listed in roadmap.
- **Action:** Create **MVP-040: ETag & Cache-Control Headers** — add ETags on list endpoints (tasks, notifications), Cache-Control on static/infrequent data (project config, user preferences).

---

## 12. Feature Request Clustering & Phase Assignment

### New MVP Features (created from this meeting)

| # | Feature | Rationale |
|---|---------|-----------|
| MVP-033 | Organization Feature Toggles | Critical for onboarding/enterprise adoption |
| MVP-034 | Environment Configuration Hardening | Required for any deployment beyond dev |
| MVP-035 | Rate Limiting & Abuse Prevention | Basic security requirement |
| MVP-036 | Queue Priority Configuration | Lightweight perf improvement |
| MVP-037 | Internal Comments | Privacy requirement for customer-facing use |
| MVP-038 | Session Invalidation on Password Change | Security requirement, already in roadmap |
| MVP-039 | User Profile Management | Core user feature, already in roadmap |
| MVP-040 | ETag & Cache-Control Headers | Performance requirement, already in roadmap |

### Deferred to Phase 2

| Feature | Rationale |
|---------|-----------|
| Stream-Safe Mode | Depends on internal comments + billing (Phase 2). Frontend-only concern. |
| CAPTCHA / Bot Detection | Nice-to-have, basic rate limiting covers MVP. |
| IP Reputation / Blocking | Enterprise feature. |
| API rate limit tiers per token type | Depends on Personal Access Tokens (Phase 2). |
| Notification digest (daily/weekly) | Already in Phase 2 roadmap. |

### Deferred to Phase 3

| Feature | Rationale |
|---------|-----------|
| Dedicated Audit Log (separate from activity_log) | Compliance feature. |
| Activity Log Retention / Archival | Scale concern. |
| RabbitMQ Quorum Queues for HA | Production scaling. |
| Database Replication | Enterprise infrastructure. |
| DB Performance Testing with EXPLAIN | Pre-production checklist item. |

---

## 13. Action Items Summary

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | Create MVP-033 through MVP-040 feature files | Marcus/Sarah | High |
| 2 | Update `.env.example` with all missing variables | Sam | High |
| 3 | Add SMTP TLS support | Marcus | High |
| 4 | Update docker-compose with persistent upload volume | Sam | Medium |
| 5 | Add Stream-Safe Mode to Phase 2 roadmap | Sarah | Low |
| 6 | Add audit log retention to Phase 3 roadmap | Hana | Low |
| 7 | Document production deployment requirements | Sam/Dana | Medium |

---

## 14. Next Steps

1. Create the 8 new MVP feature files (MVP-033 through MVP-040)
2. Implement backend features (MVP-033 through MVP-040) before starting frontend
3. Begin frontend implementation (MVP-022 through MVP-028) once backend hardening is complete
4. Monitoring (MVP-029) and release workflow (MVP-030) can proceed in parallel with frontend work

**Claire (Executive):** "Good meeting. The backend is in excellent shape. Let's get the hardening features done quickly and start frontend work. That's where users will see the value."

**Sarah (PM):** "Agreed. Marcus, focus on MVP-033 through MVP-040. Priya, start planning the frontend architecture. Sam, get the env and deployment docs sorted. Let's reconvene after the hardening sprint."
