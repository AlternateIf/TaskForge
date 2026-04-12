# Permissions Matrix

This document provides a concise reference for all permissions used in the TaskForge system. Permissions are organized by resource and scope, with active usage in both backend (API routes/services) and frontend (UI gating).

---

| Permission Key | What This Permission Is Used For |
|---|---|
| `invitation.create.org` | Backend: POST /api/v1/organizations/:orgId/invitations to send invites; Frontend: Gates Send Invite form/button in Settings |
| `invitation.delete.org` | Backend: POST .../invitations/:id/revoke to revoke pending invites; Frontend: Gates Revoke invite action |
| `invitation.read.org` | Backend: GET /api/v1/organizations/:orgId/invitations (list) and :id (detail); Frontend: Gates Invite Members/pending invites section |
| `invitation.update.org` | Backend: POST .../invitations/:id/resend to resend pending invites; Frontend: Gates Resend invite action |
| `membership.delete.org` | Backend: DELETE .../members/:memberId to remove members (includes last-admin protections); Frontend: Gates Remove member action |
| `membership.read.org` | Backend: GET /api/v1/organizations/:id/members to list org members; Frontend: Gates Members section, memberadders, assignee pickers, mentions |
| `membership.update.org` | Backend: PATCH .../members/:memberId to change member roles; Frontend: Gates Remove member action |
| `notification.create.org` | UNUSED (no active checks found) — notifications are created internally by the system without permission checks |
| `notification.delete.org` | UNUSED (no active checks found) — no API route or service checks this permission |
| `notification.read.org` | Backend: List notifications, mark read, unread count, preferences endpoints; Frontend: Gates Notifications bell, badge, dropdown |
| `organization.create.org` | Backend: POST /api/v1/organizations to create new organizations; Frontend: Gates Create organization button/form on Settings → Organizations |
| `organization.delete.org` | Backend: DELETE /api/v1/organizations/:id to soft-delete organizations; Frontend: Gates Organization deletion controls in Settings |
| `organization.read.org` | Backend: GET /organizations/:id to read org details, features, auth settings; Frontend: Gates Organization Info section on Settings → Organization |
| `organization.update.org` | Backend: Update org settings/logo/features/auth, view member's effective permissions; Frontend: Gates Edit/save org name, upload logo, toggle MFA |
| `permission.read.org` | Backend: GET .../permission-assignments to list direct permission assignments; Frontend: Gates Permission Management section |
| `permission.update.org` | Backend: Creating/deleting direct org permission assignments; Frontend: Gates Assign direct permission, Edit role permissions |
| `project.create.org` | Backend: POST .../projects to create projects; Frontend: Gates New Project/Create Project entry points |
| `project.delete.org` | Backend: Route gate for DELETE /api/v1/projects/:id (service uses update permission for actual delete); Frontend: Gates Delete Project danger zone |
| `project.read.org` | Backend: Reading projects, project-scoped read endpoints; Frontend: Gates Projects page, project nav, Project Settings access |
| `project.update.org` | Backend: Update/archive projects, project-scoped mutations; Frontend: Gates Project settings editing, Members tab |
| `role.create.org` | Backend: POST .../roles to create custom roles; Frontend: Gates Create custom role form |
| `role.delete.org` | Backend: DELETE .../roles to delete roles; Route gate for deleting role assignments; Frontend: Gates Delete role action |
| `role.read.org` | Backend: Listing org roles, role assignments, permission-matrix; Frontend: Gates Role management data/details, Permission Management view |
| `role.update.org` | Backend: Updating roles, route gate for creating/updating role assignments; Frontend: Gates Assign role to member form |
| `task.create.project` | Backend: Creating tasks and subtasks; Frontend: Gates New Task buttons/FABs |
| `task.delete.project` | UNUSED (no active checks found) — route gate exists but service uses task.update.project for delete operations |
| `task.read.project` | Backend: Reading tasks/subtasks, labels, watchers, comments, attachments; Frontend: Route guard for board, list, task detail views |
| `task.update.project` | Backend: Task updates, assignment, position changes, labels, comments, attachments; Frontend: Gates Task editing UI: drag/drop, inline editors, bulk actions, comments |

---

## Notes / Caveats

- **Unused permissions**: `notification.create.org`, `notification.delete.org`, and `task.delete.project` are defined but not actively enforced. They remain in the codebase for potential future use but have no active backend route checks or frontend UI gates.

- **Delete operation exceptions**: 
  - `project.delete.org` has a route gate but the service layer performs the actual delete using `project.update.org` (soft-delete via archive).
  - `task.delete.project` similarly uses `task.update.project` in the service layer rather than a dedicated delete permission.

- **Frontend permission consolidation**: In some cases, frontend UI uses a single permission where backend splits operations. For example, membership removal is gated by `membership.update.org` in the frontend even though both `membership.update.org` and `membership.delete.org` exist on the backend.

- **Internal system notifications**: `notification.create.org` is unused because notification creation is handled internally by system processes (e.g., task assignment, due date reminders) rather than through user-initiated API calls.