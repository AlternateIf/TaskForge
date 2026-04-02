# MVP-044: Invite-Only Access, RBAC v2, and Legacy Behavior Cleanup

## Description
Replace public self-registration with invite-first onboarding, introduce dual-scope RBAC (global + organization) with multi-role assignment, and clean up legacy auth/membership behavior so only the new model remains.

## Planning Context

### Persona Meeting
- Meeting note: `../../meetings/2026-04-02-mvp-044-invite-rbac-v2.md`
- Required before implementation.

### Personas (Planning)
- Team Lead / Admin — Jordan
- Security Expert — Nadia
- Compliance Auditor — Hana
- Onboarding User — Finn
- Backend Developer — Marcus
- Frontend Developer — Priya
- QA Tester — Anil
- Customer — Elena

### Documents (Planning)
- `../../requirements-mvp.md`
- `../../data-model-mvp.md`
- `../../roadmap.md`
- `../../api-conventions.md`

## Implementation Context

### Personas (Implementation)
- Start with Quick Cards for all listed personas.
- Expand full persona sections only where directly impacted.

### Documents (Implementation)
- `../../api-conventions.md`
- `../../project-structure.md`
- `../../data-model-mvp.md`
- Existing feature docs: MVP-006, MVP-009, MVP-010, MVP-032, MVP-033

## Dependencies
- MVP-006 (Auth — JWT)
- MVP-007 (Auth — OAuth)
- MVP-009 (Organizations)
- MVP-010 (Roles & Permissions)
- MVP-032 (Admin Auth Configuration)
- MVP-033 (Organization Feature Toggles)

## Correctness Challenges (Resolved Before Implementation)
- Public signup must be blocked for both email/password and OAuth self-provisioning.
- `AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD` must not have a hardcoded production default.
- RBAC v2 cutover needs explicit migration/backfill because runtime still depends on single-role fields and role-name checks.
- Invitation API must include create+send, list/read, and explicit `resend`/`revoke` operations.
- Multi-role union and scope evaluation rules must be explicit (no implicit deny semantics in MVP-044).
- System role policy must be explicit: only one preconfigured immutable role (`Super Admin`) with full permissions; no other preconfigured roles.
- Test fixture behavior must be explicit: `pnpm test-seed` must create its own deterministic role/assignment fixtures each run and must not rely on preconfigured non-`Super Admin` roles.
- MVP-044 governance permission catalog is authoritative for governance actions only; existing project/task/comment authorization remains as-is in MVP unless separately migrated.

## Scope

### Auth mode and bootstrap
- Add env flags:
  - `AUTH_ALLOW_PUBLIC_REGISTER=false` (default)
  - `AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL` (required in non-development when bootstrap runs)
  - `AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD` (required in non-development when bootstrap runs)
- Seed global super admin user and assignment if missing (idempotent startup task).
- Force password change on first login (`mustChangePassword=true`) before normal access.
- Add public auth config endpoint for UI mode decisions:
  - `GET /api/v1/auth/config` returns:
    - `allowPublicRegister: boolean`
    - `enabledOAuthProviders: string[]`
- In invite-only mode:
  - `POST /api/v1/auth/register` returns `403 FORBIDDEN`.
  - OAuth callback cannot create a new account unless invitation flow pre-authorized the email/provider path.

### Data model and migration
- Add user bootstrap flag:
  - `users.must_change_password` (boolean, default `false`)
- Add invitation domain tables:
  - `invitations` (invite envelope and token lifecycle)
  - `invitation_targets` (target organization rows per invite)
  - `invitation_target_roles` (role assignments per target organization)
- Add multi-role assignment table:
  - `role_assignments`
    - `user_id`
    - `role_id`
    - `organization_id` nullable (`null` = global-scope assignment)
    - `assigned_by_user_id`
    - timestamps
- Add direct permission assignment table (for invite and admin direct grants):
  - `permission_assignments`
    - `user_id`
    - `organization_id` nullable (`null` = global direct grant)
    - `permission_key`
    - `assigned_by_user_id`
    - timestamps
- Required constraints/indexes:
  - unique token hash for active invitation tokens
  - unique assignment tuple (`user_id`, `role_id`, `organization_id`)
  - unique direct permission tuple (`user_id`, `permission_key`, `organization_id`)
  - unique invitation target (`invitation_id`, `organization_id`)
  - unique invite target role (`invitation_target_id`, `role_id`)
- Migration/backfill sequence:
1. Add new tables/columns (non-breaking).
2. Backfill `role_assignments` from existing `organization_members.role_id` data.
3. Keep only `Super Admin` as preconfigured immutable role with full permission catalog.
4. Ensure bootstrap super user has `Super Admin`; this assignment cannot be removed.
5. Convert legacy built-in roles to non-system custom roles (or remove if empty), so only `Super Admin` remains preconfigured.
6. Backfill direct permission assignments only when needed by invite/migration rules.
7. Ensure no auto-seeding of org roles on new organization creation.
8. Switch authorization reads to union of role-derived permissions + direct permission assignments.
9. Keep `organization_members.role_id` for transition compatibility, but remove it from authorization decisions in this MVP.
- Migration strategy (MVP pre-alpha):
  - Execute cutover in one go (single migration window), no phased rollout flag required.
  - Legacy authorization decision paths are removed in the same implementation wave after migration validation passes.
  - Since environment is pre-alpha and data is reset frequently, prioritize clean cutover over long-lived dual-path compatibility.

### MVP-045 compatibility (read-only)
- `pnpm test-seed` must explicitly create all non-system fixture roles and assignments every run (deterministic IDs/slugs/names), after reset/migration.
- Seed execution must not assume any preconfigured role exists except immutable `Super Admin`.
- If fixture dataset needs admin/member/owner-style roles, they are seeded as custom roles by the seed script itself on each run.
- Seeded governance fixtures must remain deterministic across repeated runs and independent of runtime bootstrap defaults.
- MVP-044 must not require any implementation or document changes in MVP-045.

### Invitation flow (canonical onboarding)
- Invitation lifecycle uses one-time hashed token (single-use, 72h expiry) with states:
  - `sent` -> `accepted`
  - `sent` -> `revoked`
  - `sent` -> `expired` (derived from `expires_at`)
- Invitation operations:
  - Create+send invite (email, target organizations, role assignments and/or direct permission grants per org, allowed auth methods)
  - Resend (new token, old token invalidated), revoke
  - Token validate
  - Accept via password set or allowed OAuth
- Support both new and existing accounts.
- Existing accounts must verify identity/email before memberships are applied.
- Existing-account invite behavior:
  - Password “create account” path must not create duplicate users for an email that already exists.
  - If set-password is submitted for an already-existing email account, return conflict and require sign-in/link flow.
  - OAuth acceptance for an existing matching email links to the existing account (subject to provider-account conflict checks), then applies invite snapshot.
- Re-invite behavior is additive-only:
  - On consume, apply only missing memberships/role assignments/direct permission assignments from invite snapshot.
  - Never remove, downgrade, or overwrite existing assignments during re-invite consume.
- Allowed auth methods = env-available providers ∩ org-enabled providers ∩ invite-selected subset.
- If auth-method intersection is empty during send/accept, return `422 UNPROCESSABLE_ENTITY`.
- Token endpoints are rate-limited and return generic failure payloads that do not leak invitation existence for unrelated users.
- Invitation always carries the onboarding payload (target orgs, roles, direct permissions); payload is applied at acceptance time, not at invite creation.
- Invitation email always contains one canonical link: `/auth/invite/:token`.
- Invite lifecycle enforcement:
  - `resend` is allowed only for `sent` invites and issues a new token with fresh 72h expiry.
  - `accepted`, `revoked`, and `expired` are terminal states; they cannot be reused or resent.
  - Additional access changes always require creating a new invite.
- Expiry source-of-truth:
  - Invite expiry is anchored to `sentAt` (`expiresAt = sentAt + 72h`).
  - On resend, backend sets new `sentAt` and new `expiresAt = sentAt + 72h`.
- Expired/revoked temporary payload cleanup:
  - Invite token/payload temp data is deleted after invite becomes terminal (accepted/revoked/expired), with cleanup job idempotency.
  - Expiry boundary uses the same 72h invite expiry source of truth.

### Default invite onboarding workflow (password path)
This is the default happy-path workflow for invited users who have never set a password:
1. Inviter creates and sends an invitation with target organizations and assignments.
2. Invited user clicks invite link and lands on `/auth/invite/:token`, which shows:
   - Set-password form
   - OAuth buttons for enabled providers (`google`, `github`, custom providers when enabled)
3. On submit, backend stores password hash (bcrypt, never plaintext), marks invite accepted/used, and applies assignments.
4. User is automatically logged in (access token + refresh cookie/session created) and redirected to dashboard.

Implementation notes:
- “Never set password before” is determined by user record password hash being null/empty.
- Invite token is consumed atomically with password set + assignment application to prevent partial/duplicate acceptance.
- Auto-login after acceptance follows same auth cookie/session security settings as normal login.

### Default invite onboarding workflow (OAuth path)
This is the happy-path workflow when user chooses OAuth from the same invite page:
1. User opens the same invite link `/auth/invite/:token`.
2. User clicks one OAuth provider button shown on that page.
3. Backend validates invite token + provider and starts OAuth with invite-bound state.
4. OAuth callback verifies state and provider email; invited email must match provider verified email.
5. Backend creates or links OAuth account and applies invitation payload (organizations/roles/direct permissions) in the same acceptance transaction.
6. Invite is marked accepted/used, user is auto-logged in, and redirected to dashboard.

Implementation notes (OAuth path):
- Do not create a password-based account as an intermediate step for OAuth acceptance.
- New OAuth users are created with `passwordHash = null` unless they later set a password explicitly.
- If provider email is missing/unverified or mismatched with invited email, acceptance fails and invite is not consumed.
- If provider identity is already linked to a different user, acceptance fails with conflict and invite is not consumed.

### Invite acceptance transaction and race handling
- Password and OAuth acceptance use a single atomic transaction:
1. Lock invite row by token hash.
2. Re-check invite validity (`sent`, not expired, not revoked, not used).
3. Resolve/create/link identity.
4. Apply memberships/role assignments/direct permissions.
5. Mark invite consumed (`accepted`, `usedAt`) and commit.
- If validity check fails at password submit or OAuth callback (revoked/expired/used/race-lost), fail without consuming/applying.
- Compare-and-set semantics enforce first-wins on concurrent consume attempts.

### RBAC v2
- Introduce dual-scope roles:
  - Global roles (platform governance)
  - Organization roles (tenant governance)
- Role policy:
  - Only one preconfigured system role exists: `Super Admin`.
  - `Super Admin` always has full permission catalog.
  - `Super Admin` role definition is immutable and cannot be edited/deleted.
  - The initial bootstrap super user cannot lose `Super Admin`.
  - All other roles are user-created custom roles (global or organization scope), optional.
- Users can hold multiple roles; effective permissions are union of assigned roles plus direct permission assignments.
- Scope evaluation rules:
  - Global checks evaluate global assignments.
  - Organization checks evaluate org assignments for that org plus applicable global permissions.
  - No explicit deny semantics in MVP-044 (allow-only model).
- Permission-gate:
  - Organization creation
  - Organization CRUD/settings/auth-settings/features
  - Invite management
  - Role/permission management
  - Membership management
- `organization.create.global` replaces “any authenticated user can create organization”.
- Enforce invariant: at least one global super admin exists.
- Escalation prevention rules:
  - Actor can only assign roles they are authorized to manage.
  - Actor can only grant direct permissions they currently hold in equivalent scope.
  - `Super Admin` assignment changes require `Super Admin`; initial bootstrap super user cannot lose `Super Admin`.
  - Escalation violations fail whole request (no partial apply).

### Legacy cleanup (required in this MVP)
- Disable/block legacy public registration path when invite-only is active.
- Remove/hide register page and register CTAs in web app under invite-only mode.
- Remove legacy org member-add flow that only worked for pre-existing users by email.
- Remove single-role runtime dependency on `organization_members.role_id` from authorization path.
- Remove hardcoded role-name authorization checks in org services and route to RBAC v2 permission checks.
- Remove deprecated fallback paths after migration cutover.
- Keep MVP-044 implementation self-contained; do not require edits to MVP-045.

### API / schema additions
- Invitation endpoints (org-scoped management + token acceptance):
  - `POST /api/v1/organizations/:orgId/invitations`
  - `GET /api/v1/organizations/:orgId/invitations`
  - `GET /api/v1/organizations/:orgId/invitations/:id`
  - `POST /api/v1/organizations/:orgId/invitations/:id/resend`
  - `POST /api/v1/organizations/:orgId/invitations/:id/revoke`
  - `GET /api/v1/invitations/tokens/:token`
  - `POST /api/v1/invitations/tokens/:token/accept-password`
  - `GET /api/v1/invitations/tokens/:token/oauth/:provider`
- Role assignment endpoints:
  - `GET /api/v1/global-role-assignments`
  - `POST /api/v1/global-role-assignments`
  - `PATCH /api/v1/global-role-assignments/:id`
  - `DELETE /api/v1/global-role-assignments/:id`
  - `GET /api/v1/organizations/:orgId/role-assignments`
  - `POST /api/v1/organizations/:orgId/role-assignments`
  - `PATCH /api/v1/organizations/:orgId/role-assignments/:id`
  - `DELETE /api/v1/organizations/:orgId/role-assignments/:id`
- Role definition endpoints (custom roles only, `Super Admin` excluded from mutation):
  - `GET /api/v1/global-roles`
  - `POST /api/v1/global-roles`
  - `PATCH /api/v1/global-roles/:id`
  - `DELETE /api/v1/global-roles/:id`
  - `GET /api/v1/organizations/:orgId/roles`
  - `POST /api/v1/organizations/:orgId/roles`
  - `PATCH /api/v1/organizations/:orgId/roles/:id`
  - `DELETE /api/v1/organizations/:orgId/roles/:id`
- Direct permission assignment endpoints:
  - `GET /api/v1/global-permission-assignments`
  - `POST /api/v1/global-permission-assignments`
  - `DELETE /api/v1/global-permission-assignments/:id`
  - `GET /api/v1/organizations/:orgId/permission-assignments`
  - `POST /api/v1/organizations/:orgId/permission-assignments`
  - `DELETE /api/v1/organizations/:orgId/permission-assignments/:id`
- Shared schemas/types for invitations, RBAC v2 role definitions, role assignments, and auth config response.
- Auth response extension for `mustChangePassword`.

### Frontend cutover details
- Remove invite-incompatible routes and CTAs when `allowPublicRegister=false`:
  - `/auth/register` route removed or redirected to `/auth/login`.
  - Login page “Create one” CTA removed.
  - Mobile auth tabs “Join” entry removed.
  - Terms/privacy register links removed.
- Add invitation acceptance UX routes:
  - `/auth/invite/:token` (token validation + set-password form + OAuth provider buttons)
  - OAuth invite-accept redirect handling
- If auth response includes `mustChangePassword=true`, force navigation to password-change flow before normal app usage.

### Frontend information architecture and visibility
- Use one unified `/settings` page for governance UI (no separate `/settings/...` sub-pages for invitations/roles/permissions/organizations in MVP).
- Keep existing settings entry point from user badge menu and add `Settings` to main sidebar navigation.
- Add only one command-palette entry: `Settings`.
- `/settings` section order (top-to-bottom):
1. `Profile` (always visible)
2. `Invitations` (permission-gated)
3. `Organizations` (permission-gated)
4. `Roles` (permission-gated)
5. `Permissions` (permission-gated)
- Hidden sections are omitted, but visible sections preserve this relative order.
- Section visibility/mutation gates:
  - `Invitations` visible with `invitation.read.org`; actions use `invitation.create.org`/`invitation.update.org`/`invitation.delete.org`.
  - `Organizations` visible with `organization.read.org`; edit/delete actions use matching `organization.*` permissions.
  - `Roles` visible with `role.read.org`; create/update/delete use matching `role.*` permissions.
  - `Permissions` visible with `permission.read.org`; assign/unassign use `permission.update.org`.
  - `Super Admin` role edit/delete controls are never rendered.
  - Remove-`Super Admin` action is never rendered for the initial bootstrap super user.

### Invitation UI behavior (MVP)
- Invite entry page `/auth/invite/:token` reuses existing register/auth shell and styling.
- Invite page content order:
1. Invite context/header.
2. Set-password form.
3. Divider.
4. OAuth provider buttons.
- Invite management inside `Settings -> Invitations`:
  - Show only currently `sent` invites.
  - Row actions: `Resend`, `Revoke`.
  - `Resend` sends new link email (new token).
  - `Revoke` sends revocation notification email.
  - No draft workflow in MVP.
  - No invite detail/history page in MVP.

### Frontend UX states and copy (MVP baseline)
- Shared section states:
  - Loading state: section-level skeleton rows/placeholders.
  - Empty state: concise neutral message + primary CTA when allowed.
  - Error state: inline alert with retry action (`Try again`).
- `Profile` section:
  - Fields: `Name`, `Email`, `Organizations`.
  - Empty org list copy: `No organization memberships found.`
- `Invitations` section:
  - Primary CTA: `Invite user`.
  - Empty state copy: `No pending invitations.`
  - Sent row actions: `Resend`, `Revoke`.
  - Revoke confirmation copy: `Revoke this invitation? The current link will stop working.`
  - Existing-account password-path error copy on invite page: `Account already exists. Sign in to continue this invitation.`
- `Organizations` section:
  - Primary CTA: `Add organization`.
  - Empty state copy: `No organizations available.`
  - Row actions (permission-gated): `Edit`, `Delete`.
  - Delete confirmation copy: `Delete this organization? This performs a soft delete.`
- `Roles` section:
  - Primary CTA: `Create role`.
  - Empty state copy: `No custom roles yet.`
  - `Super Admin` row is shown with immutable badge `System role` and no edit/delete controls.
- `Permissions` section:
  - Primary CTA: `Assign permission`.
  - Empty state copy: `No direct permission assignments.`
  - Row action: `Remove`.
- Invite page (`/auth/invite/:token`):
  - Invalid/expired/revoked token state copy: `This invitation is no longer valid.`
  - Generic accept failure copy: `We couldn't complete your invitation. Please try again.`
- Toast baseline:
  - Invite sent: `Invitation sent.`
  - Invite resent: `Invitation resent with a new link.`
  - Invite revoked: `Invitation revoked.`
  - Password set success: `Password set successfully.`
  - Settings save success: `Changes saved.`

### Forced password change UX
- When `mustChangePassword=true`, frontend enforces blocking full-page flow using existing auth/register shell look and feel.
- While blocked, user can only set password or logout.
- On success, clear flag, refresh auth context, and redirect to `/dashboard`.

### Post-login organization context
- After invite acceptance, redirect to `/dashboard` (no separate org-selection route).
- Organization switcher uses existing sidebar org-name area:
  - If user has exactly one organization, render plain org-name text (no switcher control).
  - If user has multiple organizations, render org switcher control in same area.
- If prior active org is still valid, keep it; otherwise select valid invited org as default.

### Frontend quality constraints
- New UI must reuse existing design system tokens/components and established layout patterns.
- Must support both light and dark mode with no custom one-off theme primitives.
- Must be mobile-friendly:
  - `/settings` sections are usable on small screens with collapsible behavior.
  - Invite page actions are fully usable on mobile viewports.
  - Tables/lists/actions in invitation and governance sections remain accessible/responsive.

### Test requirements (unit-first)
- Add/extend frontend unit tests (Vitest + RTL) for:
  - `/settings` section order and permission-gated visibility.
  - Sidebar + user-menu + command-palette entry visibility for `Settings`.
  - Single-org sidebar org-name renders as text-only (no switcher control).
  - Multi-org sidebar org-name renders switcher control.
  - `Invitations` section states (loading/empty/error) and `Resend`/`Revoke` actions.
  - Invite page renders register-shell layout with context + set-password form + OAuth buttons.
  - Existing-account password-path inline error copy and sign-in CTA behavior.
  - `mustChangePassword` blocking flow route guard behavior.
  - Dark and light mode rendering sanity for new settings/invite UI.
  - Mobile viewport rendering sanity for invite/settings sections.
- Add/extend backend unit/service tests for:
  - Invite consume transaction atomicity and first-wins race behavior.
  - Existing-account handling rules (no duplicate users on password path, OAuth link behavior).
  - Re-invite additive-only assignment merge.
  - Terminal invite-state and resend/revoke constraints.
  - Escalation prevention for role/direct-permission grants.
  - Logging redaction guarantees (no raw tokens/credentials).

### Error contracts (MVP canonical)
- `400 BAD_REQUEST`
  - malformed invitation token format
  - unsupported/invalid OAuth provider parameter
- `401 UNAUTHORIZED`
  - missing/invalid auth for protected invite management endpoints
- `403 FORBIDDEN`
  - actor lacks required permission for invite/role/org governance operation
- `404 NOT_FOUND`
  - invitation id not found in actor-visible organization scope
- `409 CONFLICT`
  - set-password attempted for existing account email (duplicate-create blocked)
  - OAuth provider identity already linked to different user
  - invitation already consumed (concurrency race loser)
- `410 GONE`
  - invitation token is revoked or expired
- `422 UNPROCESSABLE_ENTITY`
  - auth-method intersection is empty
  - invite payload contains invalid role/permission for target org at consume time
  - invited email does not match OAuth verified email
- `429 RATE_LIMITED`
  - invitation token validate/accept endpoints exceeded rate limit

### Audit and security requirements
- Audit log events are mandatory for:
  - invitation created/sent/resent/revoked/accepted
  - role assignment create/update/delete (global + org)
  - oauth account linked via invite
  - membership applied from invitation
  - organization governance changes under RBAC v2
- Invitation token handling:
  - raw token returned only at creation/send boundary for delivery
  - persist SHA-256 token hash only
  - single-use enforced transactionally to prevent concurrent double acceptance
- Sensitive-data logging rules:
  - Never log plaintext passwords.
  - Never log raw invite tokens.
  - Never log OAuth authorization codes, provider access tokens, refresh tokens, id tokens, or session tokens.
  - Log only safe identifiers/metadata (invite id, hashed token reference, user id, org ids, permission keys, timestamps, outcome).
  - Ensure error payloads and server logs redact secrets by default.
- Token exposure hardening:
  - Keep invite token in URL path only (never query string).
  - Set invite page `Referrer-Policy: no-referrer`.
  - Do not send invite token to analytics/telemetry or third-party scripts.
  - OAuth `state` is server-bound to invite hash; raw invite token is never embedded in `state`.

### Explicit non-goals in MVP-044
- Do not redesign project/task/comment/attachment/notification permission domains in this feature.
- Do not remove project-level role override model in this feature.
- Do not introduce deny rules or policy DSL in this feature.
- Do not modify MVP-045 implementation or MVP-045 specification.

### Fixed permission catalog (MVP-044)
This catalog is the authoritative MVP-044 governance permission set. It intentionally excludes project/task/comment/attachment/notification domain permissions.

#### Permission catalog
| Permission key | Resource | Action | Scope | Purpose |
|---|---|---|---|---|
| `organization.create.global` | `organization` | `create` | `global` | Create organizations |
| `organization.read.org` | `organization` | `read` | `organization` | Read organization profile |
| `organization.update.org` | `organization` | `update` | `organization` | Update organization profile |
| `organization.delete.org` | `organization` | `delete` | `organization` | Soft-delete organization |
| `organization.settings.read.org` | `organization_settings` | `read` | `organization` | Read org settings |
| `organization.settings.update.org` | `organization_settings` | `update` | `organization` | Update org settings |
| `organization.auth_settings.read.org` | `organization_auth_settings` | `read` | `organization` | Read org auth policy |
| `organization.auth_settings.update.org` | `organization_auth_settings` | `update` | `organization` | Update org auth policy |
| `organization.features.read.org` | `organization_features` | `read` | `organization` | Read org feature flags |
| `organization.features.update.org` | `organization_features` | `update` | `organization` | Update org feature flags |
| `invitation.create.org` | `invitation` | `create` | `organization` | Create and send invitations |
| `invitation.read.org` | `invitation` | `read` | `organization` | Read invitations |
| `invitation.update.org` | `invitation` | `update` | `organization` | Resend/edit invitations |
| `invitation.delete.org` | `invitation` | `delete` | `organization` | Revoke invitations |
| `membership.create.org` | `membership` | `create` | `organization` | Add members |
| `membership.read.org` | `membership` | `read` | `organization` | List/view members |
| `membership.update.org` | `membership` | `update` | `organization` | Change member assignments |
| `membership.delete.org` | `membership` | `delete` | `organization` | Remove members |
| `role.create.org` | `role` | `create` | `organization` | Create org-scoped roles |
| `role.read.org` | `role` | `read` | `organization` | Read org-scoped roles |
| `role.update.org` | `role` | `update` | `organization` | Update org-scoped roles |
| `role.delete.org` | `role` | `delete` | `organization` | Delete org-scoped roles |
| `permission.read.org` | `permission` | `read` | `organization` | Read role permission grants |
| `permission.update.org` | `permission` | `update` | `organization` | Modify role permission grants |
| `global_role_assignment.create` | `global_role_assignment` | `create` | `global` | Assign global roles to users |
| `global_role_assignment.read` | `global_role_assignment` | `read` | `global` | View global role assignments |
| `global_role_assignment.update` | `global_role_assignment` | `update` | `global` | Change global role assignments |
| `global_role_assignment.delete` | `global_role_assignment` | `delete` | `global` | Remove global role assignments |

#### System role policy
- `Super Admin` is the only preconfigured role and has all permission keys above.
- `Super Admin` is immutable (cannot be edited or deleted).
- The initial bootstrap super user can never lose the `Super Admin` assignment.
- No other roles are preconfigured; all others are user-created custom roles.

## Acceptance Criteria
- [ ] Public registration is disabled by default and blocked at API level.
- [ ] OAuth callback no longer auto-provisions accounts without valid invitation context when invite-only mode is active.
- [ ] Register UI entry points are hidden/removed in invite-only mode.
- [ ] Global super admin is bootstrapped and forced to change password on first login.
- [ ] `Super Admin` is the only preconfigured role, is immutable, and has full permission catalog.
- [ ] Initial bootstrap super user cannot lose `Super Admin`.
- [ ] Invite flow supports new and existing accounts with one-time 72h tokens.
- [ ] No draft invite workflow in MVP: invite create endpoint sends immediately and only `sent` invites are manageable.
- [ ] Inviter can define organization targets and role assignments and/or direct permission grants before sending invite.
- [ ] Default invite onboarding flow works end-to-end: invite sent -> user sets first password -> password stored hashed -> user auto-logged-in -> redirected to dashboard.
- [ ] Invitation email always uses one canonical link (`/auth/invite/:token`) and that page shows both set-password and OAuth options.
- [ ] OAuth invite onboarding works end-to-end from the same link: choose provider -> verify state/email -> create/link OAuth user -> apply invite payload -> auto-login -> dashboard redirect.
- [ ] OAuth acceptance does not require creating an intermediate password user; new OAuth users are created with `passwordHash=null`.
- [ ] Existing-account handling is correct: password create-account path does not create duplicates; user is required to sign in/link before invite apply.
- [ ] Existing-account OAuth handling links to the existing matching-email user and does not create duplicate users.
- [ ] Re-invite consume is additive-only and applies only missing memberships/roles/permissions without removing or downgrading existing assignments.
- [ ] Allowed auth methods on invite are correctly constrained by env/org/invite intersection.
- [ ] Invite resend invalidates previously issued token.
- [ ] Invite expiry is anchored to `sentAt` with `72h` TTL, and resend resets `sentAt`/`expiresAt`.
- [ ] Invite acceptance is single-use under concurrent requests (first succeeds, subsequent attempt fails).
- [ ] Invite terminal-state rules are enforced (`accepted`/`revoked`/`expired` cannot be reused/resend; new access changes require new invite).
- [ ] Invite acceptance re-validates token state at password submit and OAuth callback; revoked/expired/used invites never apply assignments.
- [ ] Password and OAuth acceptance apply identity link/create, assignment apply, and invite consume atomically in one transaction.
- [ ] RBAC v2 supports global+org scope and multi-role union permissions.
- [ ] Escalation prevention is enforced server-side for role assignment and direct permission grants.
- [ ] Organization creation is permission-gated.
- [ ] Role and membership changes are effective on next request.
- [ ] Legacy role-name checks and single-role authorization paths are removed.
- [ ] Authorization no longer reads `organization_members.role_id` for decision-making (reads role assignments).
- [ ] Legacy direct member-add-by-email path is removed from public API.
- [ ] Audit logs are written for invite, role, membership, and org governance changes.
- [ ] Logs and error outputs never leak plaintext credentials or auth tokens (passwords, invite raw tokens, OAuth/session tokens/codes).
- [ ] Invite token exposure hardening is enforced (path-only token, no-referrer policy, no telemetry leakage, safe OAuth state binding).
- [ ] Permission seeding uses the fixed MVP-044 permission catalog defined in this document.
- [ ] `pnpm test-seed` creates deterministic custom role fixtures on every run and does not rely on predefined non-`Super Admin` roles.
- [ ] Frontend uses one unified `/settings` page with collapsible permission-gated sections (`Profile`, `Invitations`, `Organizations`, `Roles`, `Permissions`) and no separate governance sub-pages.
- [ ] `/settings` visible sections follow fixed order: `Profile`, `Invitations`, `Organizations`, `Roles`, `Permissions` (with hidden sections omitted).
- [ ] `Settings` is reachable from user badge menu, main sidebar, and command palette (single `Settings` command only).
- [ ] `Profile` section shows name, email, and all organization memberships (not only one org).
- [ ] Invitations UI shows only `sent` invites with `Resend` and `Revoke` actions; no draft workflow and no invite detail/history page in MVP.
- [ ] Invite entry page reuses existing register/auth shell with invite context + set-password form + OAuth buttons.
- [ ] `mustChangePassword` enforces blocking full-page flow until completed.
- [ ] Multi-org post-login context uses existing sidebar org-name area as switcher; when user has exactly one org, render plain org-name text (no switcher control).
- [ ] New frontend UI is mobile-friendly and fully usable in both dark and light mode while reusing existing design tokens/components.
- [ ] Migration/cutover for RBAC v2 and invite-only model is executed in one go for pre-alpha (no phased rollout dependency).
- [ ] Unit tests cover invite lifecycle, RBAC v2 checks, bootstrap flow, OAuth invite constraints, settings section gating/order, and legacy regression cases.
- [ ] API responses follow the MVP-044 error contract mappings for invite and onboarding edge cases.
- [ ] MVP-044 implementation is self-contained and does not require changes to MVP-045.

## Post-Implementation Updates (Required)
- [ ] Acceptance criteria checked in this file (`- [x]`)
- [ ] Corresponding roadmap entry updated in `../../roadmap.md`
