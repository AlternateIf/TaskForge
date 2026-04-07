# MVP-010: Roles & Permissions

## Description
Built-in role definitions, RBAC middleware for Fastify, and permission checking on all resource endpoints. This is a cross-cutting concern that gates every API operation.

## Personas
- **Jordan (Team Lead)**: Configures who can do what
- **Nadia (Security)**: Least-privilege enforcement at every boundary
- **Elena (Customer)**: Restricted access — can only see whitelisted projects

## Dependencies
- MVP-009 (organizations, membership, roles created)

## Scope

### Built-in roles and permissions

| Role | Organization | Project | Task | Comment |
|---|---|---|---|---|
| Super Admin | manage | manage | manage | manage |
| Admin | read, update | manage | manage | manage |
| Project Manager | read | create, read, update | manage | manage |
| Team Member | read | read | create, read, update (own) | create, read, update (own) |
| Guest | read | read | read | read |

**Permission model**: `(role, resource, action, scope)`
- Resources: organization, project, task, comment, attachment, notification
- Actions: create, read, update, delete, manage (all)
- Scope: organization-level or project-level

### Files to create/modify
```
apps/api/src/
├── plugins/
│   └── auth.plugin.ts           # Add: requirePermission(resource, action) decorator
├── services/
│   └── permission.service.ts     # Check user permissions for resource+action in context
├── hooks/
│   └── authorize.hook.ts         # Fastify preHandler that checks permissions
packages/shared/src/
├── constants/
│   ├── roles.ts                  # Role names, built-in role definitions
│   └── permissions.ts            # Resource + action enums
```

### Permission check flow
1. `auth.plugin.ts` extracts user from JWT, loads memberships and roles
2. Route registers `preHandler: [authorize({ resource: 'task', action: 'create' })]`
3. `authorize.hook.ts` calls `permission.service.ts` to check if user's role has the required permission in the current organization/project context
4. If denied → 403 FORBIDDEN

### Project-level override
- Users can have different roles at project level via ProjectMember.role_id
- Project role overrides organization role for that project
- If no project membership → fall back to organization role

### Middleware pattern
```typescript
// In route definition
app.post('/api/v1/projects/:projectId/tasks',
  { preHandler: [authenticate, authorize({ resource: 'task', action: 'create' })] },
  createTaskHandler
);
```

## Acceptance Criteria
- [x] All 5 built-in roles are seeded on organization creation (with permissions)
- [x] Permission checks gate every CRUD operation (authorize hook)
- [x] Super Admin can do everything (fast path bypass)
- [x] Guest can only read
- [x] Team Member can create/update own tasks but not delete
- [x] Project-level roles override org-level roles
- [x] 403 returned with standard error format when denied
- [x] Permission check is efficient (cached role+permissions per request)
- [x] ~~Activity log records permission/role changes~~ → deferred to MVP-017
- [x] Tests cover each role's access to each resource
