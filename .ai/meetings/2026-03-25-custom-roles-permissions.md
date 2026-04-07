# Meeting: Custom Roles & Granular Permission Management

**Date**: 2026-03-25
**Topic**: Full customization of roles and permissions — live editing without downtime
**Phase**: Phase 2 — Collaboration & Visibility

---

## Attendees

| Persona | Name | Role |
|---|---|---|
| Team Lead | Jordan | Engineering Team Lead — configures roles and permissions for teams |
| Security Expert | Nadia | Application Security Engineer — least-privilege enforcement |
| Compliance Auditor | Hana | Compliance Officer — audit trails for role/permission changes |
| Customer | Elena | External client — needs clear, restricted access boundaries |
| Backend Developer | Marcus | Backend developer — implements the permission system |
| Project Manager | Sarah | PM — needs to understand what her team members can and can't do |
| People Manager | Rosa | Engineering Manager — manages cross-team role assignments |
| Executive | Claire | VP of Engineering — wants org-wide role governance without micromanaging |
| Freelancer | Yuki | Independent designer — needs simple, clear roles across client workspaces |
| UX Expert | Lena | UX designer — cares about the role management UI being intuitive |
| QA Tester | Anil | Senior QA — wants fine-grained control over who can close bugs |

---

## Discussion

### Jordan (Team Lead)
> "Right now we have 5 built-in roles that cover the basics, but every team is different. I need to create a 'Tech Lead' role that can manage tasks and view reports but can't change org settings. I also want to create a 'Contractor' role that's like Team Member but can't see billing or time data from other members. The key requirement: I should be able to do this from the UI, and changes should take effect immediately — no restart, no deploy."

### Nadia (Security Expert)
> "Live permission changes are fine, but we need guardrails:
> 1. **Cannot escalate beyond your own permissions** — an Admin shouldn't be able to create a role with Super Admin powers.
> 2. **Built-in system roles should be immutable** — the 5 defaults can never be deleted or have their permissions reduced. You can clone them as a starting point for custom roles.
> 3. **Permission changes must be atomic** — if you're editing a role with 20 permissions, it should be all-or-nothing, not a partial update that leaves a window of unintended access.
> 4. **Every permission change should be audit-logged** with before/after state.
> 5. **There should be a 'preview' mode** — before saving, show what access the role will gain or lose."

### Hana (Compliance Auditor)
> "This is high-risk for compliance. Every change to a role or permission must produce an immutable audit record: who changed what, when, and the exact before/after permission set. I need to be able to export a 'Role Change History' report for any given time range.
>
> Also, for regulated environments, I'd like an **approval workflow** for role changes — at minimum, a 'pending approval' state where a Super Admin must confirm changes made by an Admin. But that can be optional and configurable per org. For MVP of this feature, just the audit log is critical.
>
> One more thing: **role assignment history per user**. When I audit who had access to what, I need to see not just current roles but historical: 'User X had Admin role from Jan 1 to Mar 15, then was changed to Team Member'."

### Elena (Customer)
> "I don't care about configuring roles — but I care deeply about the *result*. When someone creates a custom 'Client Viewer' role for me, I should see a clear, simple interface. No confusing permission denied errors. If I can't do something, the button shouldn't even be there. And when the team changes my permissions, it should work immediately — I shouldn't have to log out and back in."

### Marcus (Backend Developer)
> "Implementation thoughts:
> - **Database-driven, not config-driven** — permissions live in the DB, so changes are instant with no restart.
> - **Permission cache invalidation** — we currently cache permissions per-request, which is fine. But if we add any longer-lived cache (e.g., Redis), we need a cache-bust strategy. For now, per-request DB lookup is simple and correct. We can add Redis caching later with a pub/sub invalidation channel.
> - **Custom role schema**: just a row in `roles` with `is_system = false`. Custom roles get entries in `permissions` just like built-in ones.
> - **API design**: CRUD on `/api/v1/organizations/:orgId/roles` and a sub-resource for permissions. The permission update endpoint should accept the full permission set (PUT semantics) to ensure atomicity.
> - **Validation on save**: server-side check that the acting user's role has a superset of the permissions being assigned. Reject escalation attempts with 403.
> - **No downtime**: since everything is DB-driven and resolved per-request, there's zero downtime. No Docker restart, no config file, no env var change."

### Sarah (Project Manager)
> "I need to understand at a glance what each role can do. A permission matrix view — roles as columns, resources as rows, with checkboxes — would be ideal. Also, when I'm assigning someone to a project, I want to see what their effective permissions will be (org role + project role override). A tooltip or preview panel would help a lot.
>
> Also, can we support **role templates**? Like a 'PM role for client-facing projects' template that I can apply across projects. That way I don't have to re-create the same custom role in every project."

### Rosa (People Manager)
> "I manage 18 people across 3 teams. When someone transfers between teams, I need to change their role quickly. Bulk role assignment would be great — select 5 people, assign them the new role.
>
> I also want to see a **role summary per team**: how many Super Admins, Admins, Team Members, etc. This helps me spot role creep — someone getting Admin on every project when they should be Team Member.
>
> And critically: **role changes should not require the user to re-authenticate**. If I change someone's role, their next API call should already use the new permissions."

### Claire (Executive)
> "I don't want to manage individual permissions — that's Jordan and Rosa's job. But I want governance controls:
> 1. **Role count limits** — prevent role sprawl. Maybe a warning when an org has more than 15 custom roles.
> 2. **Permission usage analytics** — which custom permissions are actually being used? If a role was created 6 months ago and nobody's assigned to it, flag it.
> 3. **Org-wide role policy** — the ability to say 'no custom role in this org can have delete permission on projects' as a policy.
>
> Keep it out of my day-to-day, but give me the reporting to audit it quarterly."

### Yuki (Freelancer)
> "I juggle multiple client workspaces. Each client might want slightly different access for me. A 'Designer' role in one workspace might include task creation, while another client might only want me to comment. Please make sure custom roles are per-organization, not global. And the role management UI should be lightweight — I'm a one-person shop, I don't want to wade through enterprise complexity."

### Lena (UX Expert)
> "The role management UI needs to be:
> 1. **Visual permission matrix** — not a list of checkboxes in a form, but an actual grid: resources on rows, actions on columns, roles as tabs or columns.
> 2. **Diff view on save** — before confirming, show a clear diff: 'This role will gain: create tasks in all projects. This role will lose: delete comments.'
> 3. **Inline help** — each permission should have a tooltip explaining what it actually controls. 'create:task' means nothing to a non-technical Admin.
> 4. **Role cloning** — start from an existing role (built-in or custom) and modify. Don't force people to build from scratch.
> 5. **Search/filter in the permission matrix** — for orgs with many resources and custom fields, the matrix could get large."

### Anil (QA Tester)
> "I want to test that permission changes work instantly. From a QA perspective:
> - Change a role's permissions → the user's next request should reflect the change.
> - Remove 'delete' from a role → verify the user gets 403 on their next delete attempt.
> - Escalation prevention → verify an Admin can't create a Super Admin-level role.
>
> Also, for bug tracking specifically: I'd love a 'Bug Triager' custom role that can change bug priority and assign, but can't close bugs. Only the Reporter or a PM should close bugs. This kind of fine-grained action control would be amazing."

---

## Decisions

### 1. Custom Roles — CRUD
- Custom roles are per-organization (`is_system = false` in `roles` table)
- Any Super Admin or Admin can create/edit/delete custom roles
- Built-in system roles (`is_system = true`) are **immutable** — cannot be edited or deleted
- Built-in roles can be **cloned** as a starting point for custom roles
- Custom roles can be assigned at both org-level and project-level
- Role count soft limit: warning at 20 custom roles per org (configurable), no hard cap

### 2. Permission Model — Granular & Extensible
- Permissions remain as `(role_id, resource, action, scope)` tuples in the `permissions` table
- Resources: `organization`, `project`, `task`, `comment`, `attachment`, `notification` (extensible for custom fields, time entries, etc. in later features)
- Actions: `create`, `read`, `update`, `delete`, `manage` (expands to all four)
- Scopes: `organization` (applies everywhere) or `project` (only within assigned projects)
- Permission update is **full replacement** (PUT semantics): send the complete permission set for a role → server replaces all permissions atomically in a transaction

### 3. Live Updates — No Downtime
- All permissions are resolved from the database per-request (already implemented in MVP-010)
- No config files, no env vars, no Docker restarts needed
- Permission changes take effect on the user's **next API request** — no re-authentication required
- If Redis caching is added later, use pub/sub invalidation on role changes

### 4. Escalation Prevention
- When creating or editing a role, the server validates that every permission in the new set is also held by the acting user's effective role
- Super Admin is exempt (can grant any permission)
- Admins cannot create roles with `manage:organization` or `delete:organization` (Super Admin-only actions)
- Violation returns 403 with a clear message: "Cannot grant permissions you do not hold"

### 5. Audit Trail
- Every role create/update/delete produces an activity log entry with full before/after permission diff
- Every role assignment change (user X assigned role Y) produces an activity log entry
- Role assignment history is queryable per-user: "show all role changes for user X in the last 90 days"
- Integrates with the existing activity log system (MVP-017)

### 6. API Design
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/organizations/:orgId/roles` | List all roles (built-in + custom) |
| POST | `/api/v1/organizations/:orgId/roles` | Create custom role |
| GET | `/api/v1/organizations/:orgId/roles/:roleId` | Get role with permissions |
| PUT | `/api/v1/organizations/:orgId/roles/:roleId` | Update custom role (full permission replacement) |
| DELETE | `/api/v1/organizations/:orgId/roles/:roleId` | Delete custom role (must reassign members first) |
| POST | `/api/v1/organizations/:orgId/roles/:roleId/clone` | Clone role (built-in or custom) |
| GET | `/api/v1/organizations/:orgId/roles/:roleId/preview` | Preview effective permissions (after proposed changes) |
| GET | `/api/v1/organizations/:orgId/roles/matrix` | Full permission matrix (all roles × all resources) |

### 7. UI Recommendations (Frontend)
- **Permission matrix grid**: resources as rows, actions as columns, with toggle switches
- **Diff view before save**: show gained/lost permissions highlighted in green/red
- **Role cloning wizard**: select source role → customize → name → save
- **Inline tooltips**: human-readable descriptions for each permission
- **Bulk role assignment**: select multiple users → assign role
- **Role usage stats**: member count per role, last-assigned date

### 8. Deferred to Phase 3
- **Role change approval workflows** (Hana's request) — optional approval gate before role changes take effect
- **Org-wide role policies** (Claire's request) — admin-defined constraints like "no custom role can have delete:project"
- **Permission usage analytics** (Claire's request) — track which permissions are actually exercised
- **Role templates** (Sarah's request) — shareable role definitions across projects/orgs

---

## Action Items

1. Create feature file for Phase 2: custom roles and granular permission management
2. Add to Phase 2 roadmap section
3. Ensure MVP-010's built-in roles and permission seeding remain stable as the foundation
4. Design DB migration plan: no schema changes needed — `roles` and `permissions` tables already support custom roles (`is_system = false`)
