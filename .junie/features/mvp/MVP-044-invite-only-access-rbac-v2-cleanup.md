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

## Scope

### Auth mode and bootstrap
- Add env flags:
  - `AUTH_ALLOW_PUBLIC_REGISTER=false` (default)
  - `AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL=admin@admin.com`
  - `AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD=Admin123!` (temporary)
- Seed global super admin if missing.
- Force password change on first login (`mustChangePassword=true`) before normal access.

### Invitation flow (canonical onboarding)
- Add invitation lifecycle with one-time hashed token (single-use, 72h expiry):
  - Create invite (email, target organizations, roles per org, allowed auth methods)
  - Send/revoke/resend
  - Token validate
  - Accept via password set or allowed OAuth
- Support both new and existing accounts.
- Existing accounts must verify identity/email before memberships are applied.
- Allowed auth methods = env-available providers ∩ org-enabled providers ∩ invite-selected subset.

### RBAC v2
- Introduce dual-scope roles:
  - Global roles (platform governance)
  - Organization roles (tenant governance)
- Users can hold multiple roles; effective permissions are union of assigned roles.
- Permission-gate:
  - Organization creation
  - Organization CRUD/settings/auth-settings/features
  - Invite management
  - Role/permission management
  - Membership management
- Enforce invariant: at least one global super admin exists.

### Legacy cleanup (required in this MVP)
- Disable/block legacy public registration path when invite-only is active.
- Remove/hide register page and register CTAs in web app under invite-only mode.
- Remove legacy org member-add flow that only worked for pre-existing users by email.
- Remove single-role runtime dependency on `organization_members.role_id` from authorization path.
- Remove hardcoded role-name authorization checks in org services and route to RBAC v2 permission checks.
- Remove deprecated fallback paths after migration cutover.
- Update linked MVP docs so behavior is consistent and canonical.

### API / schema additions
- Invitation endpoints:
  - `POST /api/v1/invitations`
  - `POST /api/v1/invitations/:id/send`
  - `POST /api/v1/invitations/:id/revoke`
  - `GET /api/v1/invitations/token/:token`
  - `POST /api/v1/invitations/token/:token/accept-password`
  - `GET /api/v1/invitations/token/:token/oauth/:provider`
- Role/assignment endpoints for global and org scopes.
- Shared schemas/types for invitations, RBAC v2 role definitions, and role assignments.
- Auth response extension for `mustChangePassword`.

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
| `invitation.create.org` | `invitation` | `create` | `organization` | Create invitation drafts |
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

#### Fixed baseline role mapping
- `Global Super Admin`: all permission keys above.
- `Global Admin`: all global-scope permissions except super-admin invariants.
- `Organization Owner`: all organization-scope permissions for assigned organizations.
- `Organization Admin`: organization read/update/settings/auth/features + invitation + membership read/update + role/permission read.
- `Organization Member`: organization read + membership read (self-visible) only.

## Acceptance Criteria
- [ ] Public registration is disabled by default and blocked at API level.
- [ ] Register UI entry points are hidden/removed in invite-only mode.
- [ ] Global super admin is bootstrapped and forced to change password on first login.
- [ ] Invite flow supports new and existing accounts with one-time 72h tokens.
- [ ] Inviter must define org membership and roles before sending invite.
- [ ] Allowed auth methods on invite are correctly constrained by env/org/invite intersection.
- [ ] RBAC v2 supports global+org scope and multi-role union permissions.
- [ ] Organization creation is permission-gated.
- [ ] Role and membership changes are effective on next request.
- [ ] Legacy role-name checks and single-role authorization paths are removed.
- [ ] Audit logs are written for invite, role, membership, and org governance changes.
- [ ] Permission seeding uses the fixed MVP-044 permission catalog defined in this document.
- [ ] Tests cover invite lifecycle, RBAC v2 checks, bootstrap flow, and legacy regression cases.

## Post-Implementation Updates (Required)
- [ ] Acceptance criteria checked in this file (`- [x]`)
- [ ] Corresponding roadmap entry updated in `../../roadmap.md`
