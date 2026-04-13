# Permissions Matrix

## Source Of Truth

Permission definitions must only live in:
- `packages/shared/src/constants/permission.ts`
- `packages/shared/src/constants/permissions.ts`

## Naming And Scoping Rules

- Permission key format: `{resource}.{action}.{scope}`.
- Valid scopes are `org` and `project`.
- Global roles are not allowed.
- Do not add or use global permission helpers such as `hasGlobalPermission`, `requireGlobal*`, or `requireSuperAdmin`.

## Permission Matrix

| Permission | What It Does |
|---|---|
| `organization.create.org` | Create organizations. |
| `organization.read.org` | Read organization details and metadata. |
| `organization.update.org` | Update organization settings and attributes. |
| `organization.delete.org` | Delete or archive organizations. |
| `invitation.create.org` | Create organization invitations. |
| `invitation.read.org` | Read organization invitations. |
| `invitation.update.org` | Update or resend invitations. |
| `invitation.delete.org` | Revoke or delete invitations. |
| `membership.read.org` | Read organization memberships. |
| `membership.update.org` | Update member roles or membership attributes. |
| `membership.delete.org` | Remove members from an organization. |
| `role.create.org` | Create organization roles. |
| `role.read.org` | Read organization roles and assignments. |
| `role.update.org` | Update organization roles and assignments. |
| `role.delete.org` | Delete organization roles and assignments. |
| `permission.read.org` | Read permission assignments and permission metadata. |
| `permission.update.org` | Assign or revoke direct permissions. |
| `project.create.org` | Create projects within an organization. |
| `project.read.org` | Read projects within an organization. |
| `project.update.org` | Update project settings and project data. |
| `project.delete.org` | Delete or archive projects. |
| `notification.create.org` | Create organization-scoped notifications. |
| `notification.read.org` | Read organization-scoped notifications. |
| `notification.update.org` | Update notification state and settings. |
| `notification.delete.org` | Delete organization-scoped notifications. |
| `task.create.project` | Create tasks in a project. |
| `task.read.project` | Read tasks in a project. |
| `task.update.project` | Update tasks in a project. |
| `task.delete.project` | Delete tasks in a project. |
