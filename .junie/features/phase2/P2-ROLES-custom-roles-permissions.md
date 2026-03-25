# Phase 2: Custom Roles & Granular Permission Management

## Description
Full customization of roles and permissions at the organization level. Admins can create, edit, clone, and delete custom roles with granular per-resource, per-action permission control — all live, with zero downtime. No Docker restart, no rebuild, no config changes. Changes take effect on the user's next API request.

## Meeting
See [2026-03-25-custom-roles-permissions.md](../../meetings/2026-03-25-custom-roles-permissions.md) for the full persona discussion.

## Personas
- **Jordan (Team Lead)**: Creates custom roles like "Tech Lead" and "Contractor" with tailored access
- **Nadia (Security)**: Escalation prevention, atomic updates, immutable system roles
- **Hana (Compliance)**: Full audit trail for every role/permission change with before/after diffs
- **Elena (Customer)**: Clear, immediate permission boundaries — buttons hidden when access is denied
- **Marcus (Backend)**: DB-driven permissions, per-request resolution, no caching invalidation issues
- **Sarah (PM)**: Permission matrix view, effective permission preview, role templates
- **Rosa (People Manager)**: Bulk role assignment, role summary per team, instant role changes
- **Claire (Executive)**: Role governance — count limits, usage analytics, org-wide policies
- **Yuki (Freelancer)**: Per-org custom roles, lightweight UI
- **Lena (UX)**: Visual permission matrix, diff view, inline help, role cloning wizard
- **Anil (QA)**: Fine-grained action control (e.g., "Bug Triager" role)

## Dependencies
- MVP-010 (built-in roles and permission system)
- MVP-017 (activity log for audit trail)

## Scope

### Custom Role CRUD
- Custom roles are per-organization (`is_system = false`)
- Built-in system roles are **immutable** — cannot be edited or deleted
- Built-in roles can be **cloned** as a starting point for custom roles
- Custom roles assignable at both org-level and project-level
- Role count soft limit: warning at 20 custom roles per org (configurable)
- Deleting a custom role requires reassigning all members first

### Granular Permission Editing
- Permissions remain as `(role_id, resource, action, scope)` tuples
- Resources: `organization`, `project`, `task`, `comment`, `attachment`, `notification` (extensible)
- Actions: `create`, `read`, `update`, `delete`, `manage` (expands to all four)
- Scopes: `organization` (applies everywhere) or `project` (only within assigned projects)
- Permission update uses **PUT semantics**: full replacement in a single transaction (atomic)

### Live Updates (Zero Downtime)
- All permissions resolved from database per-request (no config files, no env vars)
- Changes take effect on the user's **next API request** — no re-authentication required
- No Docker restart or rebuild needed
- Future Redis caching (if added) uses pub/sub invalidation on role changes

### Escalation Prevention
- Server validates that every permission in the new role is also held by the acting user
- Super Admin exempt (can grant any permission)
- Admins cannot create roles with `manage:organization` or `delete:organization`
- Violation returns 403: "Cannot grant permissions you do not hold"

### Audit Trail
- Every role create/update/delete produces an activity log entry with full before/after permission diff
- Every role assignment change produces an activity log entry
- Role assignment history queryable per-user for compliance

### API Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/organizations/:orgId/roles` | List all roles (built-in + custom) with member count |
| POST | `/api/v1/organizations/:orgId/roles` | Create custom role with permissions |
| GET | `/api/v1/organizations/:orgId/roles/:roleId` | Get role details with full permission list |
| PUT | `/api/v1/organizations/:orgId/roles/:roleId` | Update custom role (atomic full permission replacement) |
| DELETE | `/api/v1/organizations/:orgId/roles/:roleId` | Delete custom role (400 if members still assigned) |
| POST | `/api/v1/organizations/:orgId/roles/:roleId/clone` | Clone any role as a new custom role |
| GET | `/api/v1/organizations/:orgId/roles/:roleId/preview` | Preview effective permissions with proposed changes |
| GET | `/api/v1/organizations/:orgId/roles/matrix` | Full permission matrix (all roles × all resources × all actions) |

### Files to create/modify
```
apps/api/src/
├── routes/organizations/
│   ├── roles.routes.ts
│   ├── roles.handlers.ts
│   └── roles.schemas.ts
├── services/
│   └── role.service.ts          # Custom role CRUD, cloning, escalation checks
packages/shared/src/schemas/
└── role.schema.ts               # Zod schemas for role create/update
```

### Frontend Requirements (Summary)
- **Permission matrix grid**: resources as rows, actions as columns, toggle switches per cell
- **Diff view before save**: gained permissions in green, lost permissions in red
- **Role cloning wizard**: select source → customize → name → save
- **Inline tooltips**: human-readable descriptions for each resource/action pair
- **Bulk role assignment**: multi-select users → assign role
- **Role usage summary**: member count per role, last-assigned date
- **Hide inaccessible actions**: buttons/menus hidden when user lacks permission (not just disabled)

## Deferred to Phase 3
- Role change approval workflows (optional approval gate before changes take effect)
- Org-wide role policies (admin-defined constraints, e.g., "no custom role can delete projects")
- Permission usage analytics (track which permissions are actually exercised)
- Role templates (shareable role definitions across projects/orgs)

## Acceptance Criteria
- [ ] Super Admin and Admin can create custom roles with granular permissions
- [ ] Built-in system roles cannot be edited or deleted
- [ ] Any role (built-in or custom) can be cloned as a new custom role
- [ ] Permission updates are atomic (all-or-nothing transaction)
- [ ] Changes take effect immediately — no restart, no re-auth, no downtime
- [ ] Escalation prevention: users cannot grant permissions they don't hold
- [ ] Super Admin bypasses escalation check
- [ ] Deleting a role with assigned members returns 400
- [ ] Permission matrix endpoint returns all roles × resources × actions
- [ ] Every role/permission change produces an audit trail entry
- [ ] Role assignment history is queryable per-user
- [ ] 403 returned with clear message when permission denied
- [ ] Tests cover: custom role CRUD, cloning, escalation prevention, live permission change, audit logging
