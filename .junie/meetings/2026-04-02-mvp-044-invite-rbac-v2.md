# Pre-Implementation Meeting: MVP-044 Invite-Only Access + RBAC v2 Cleanup — 2026-04-02

## Attendees
- **Jordan (Team Lead / Admin)** — org governance, onboarding policy, operational guardrails
- **Nadia (Security Expert)** — invite-token security, bootstrap account risk, least-privilege enforcement
- **Hana (Compliance Auditor)** — traceability and auditable governance changes
- **Finn (Onboarding User)** — invite acceptance clarity and friction reduction
- **Marcus (Backend Developer)** — migration/backfill strategy and authorization cutover
- **Priya (Frontend Developer)** — auth UX cutover, register-page removal, invite acceptance flow
- **Anil (QA Tester)** — regression matrix and race-condition coverage
- **Elena (Customer)** — predictable access controls and non-breaking tenant behavior

---

## Discussion

### 1. Invite-Only Cutover Scope

**Jordan:** We need invite-first onboarding immediately; public self-registration should not remain as a parallel path.

**Nadia:** OAuth currently self-provisions users. That is still public registration by another path and must be blocked when invite-only is active.

**Decision:**
1. Invite-only is the default mode (`AUTH_ALLOW_PUBLIC_REGISTER=false`).
2. `POST /api/v1/auth/register` is blocked in invite-only mode.
3. OAuth callback cannot create brand-new users without valid invitation context.

---

### 2. Bootstrap Super Admin Safety

**Nadia:** Hardcoded bootstrap credentials are unacceptable outside development.

**Marcus:** We can keep bootstrap idempotent and environment-gated to avoid accidental resets.

**Decision:**
1. Bootstrap super-admin creation is idempotent (create only when missing).
2. Bootstrap password/env values are required in non-development when bootstrap runs.
3. Bootstrap account is forced through `mustChangePassword` before normal access.

---

### 3. RBAC v2 Migration and Backfill

**Marcus:** Runtime still depends on `organization_members.role_id` and role-name checks in services. We need staged migration to avoid breakage.

**Anil:** We need explicit acceptance criteria proving authorization no longer reads legacy single-role fields.

**Jordan:** We should stop shipping multiple built-in roles. Only `Super Admin` should be preconfigured; everything else should be explicitly created by administrators.

**Decision:**
1. Introduce `role_assignments` as canonical runtime source for authorization decisions.
2. Backfill assignments from existing membership role data before cutover.
3. Keep `organization_members.role_id` only for transition compatibility in MVP-044, not for auth decisions.
4. Remove hardcoded role-name checks from org governance services/routes.
5. `Super Admin` is the only preconfigured immutable role with full permission catalog.
6. Initial bootstrap super user cannot lose `Super Admin`.

---

### 4. Invitation Lifecycle and API Completeness

**Priya:** We need complete API coverage for admin screens: create+send, list, read, resend, revoke, plus assignment of roles and direct permissions per organization.

**Hana:** Resend must invalidate prior token to preserve one-time token guarantees.

**Decision:**
1. Invitation state model in MVP-044: `sent`, `accepted`, `revoked`, `expired` (no draft state).
2. `resend` issues a new token and invalidates previous token.
3. Token lifecycle endpoints are separate from org management endpoints.
4. Existing-account acceptance requires identity proof with matching invited email before memberships are applied.
5. Invite payload supports organization targets with role assignments and/or direct permission grants.

---

### 5. Auth-Method Intersection Rules

**Finn:** Invite acceptance must not present methods that fail later due to org/env policy.

**Marcus:** Resolve this server-side as intersection of env providers, org settings, and invite-allowed subset.

**Decision:**
1. Effective methods = env-enabled ∩ org-enabled ∩ invite-selected.
2. Empty intersection returns `422 UNPROCESSABLE_ENTITY` on send/accept.
3. UI method chooser is powered by token validation response.

---

### 6. Frontend Cutover Requirements

**Priya:** Register route and CTAs exist in multiple places (login, mobile tabs, legal pages). This has to be explicit in feature scope.

**Jordan:** We also need a simple auth-config endpoint so frontend can render mode-specific UI without build-time coupling.

**Decision:**
1. Add `GET /api/v1/auth/config` for runtime mode/provider metadata.
2. Remove or redirect `/auth/register` when invite-only is active.
3. Remove register CTAs from login/mobile/legal surfaces.
4. Add invite acceptance route(s) in auth flow.
5. Use one unified `/settings` page with collapsible, permission-gated sections (`Profile`, `Invitations`, `Organizations`, `Roles`, `Permissions`) instead of separate governance pages.
6. Render only sections/actions the user is permitted to see/use.

---

### 7. Audit and Test Expectations

**Hana:** Governance changes need clear audit trail coverage.

**Anil:** Add concurrency tests for double accept and regression tests for legacy path removal.

**Decision:**
1. Audit events are mandatory for invitation lifecycle, role assignments, membership application, and governance changes.
2. Test matrix includes:
   - invitation lifecycle + resend invalidation
   - concurrent token acceptance race
   - OAuth invite-only constraints
   - bootstrap `mustChangePassword`
   - authorization cutover off legacy single-role field

---

## Final Implementation Decisions Summary

1. Invite-only is default and applies to both password and OAuth onboarding paths.
2. Bootstrap super-admin flow is secure-by-default and idempotent.
3. `Super Admin` is the only preconfigured immutable role, and the initial bootstrap super user cannot lose it.
4. `role_assignments` becomes canonical for RBAC v2 decisions after backfill.
5. Invitation API is complete for MVP flow (create+send, list/read, resend/revoke + token accept endpoints) and supports role/permission targeting per organization.
6. Auth methods are strictly constrained by env/org/invite intersection.
7. Frontend register surfaces are removed under invite-only; invite acceptance and unified settings sections are added with permission-based visibility.
8. Audit and regression test coverage are mandatory for cutover readiness.
9. MVP-044 must remain self-contained; MVP-045 is already complete and must not be modified.
