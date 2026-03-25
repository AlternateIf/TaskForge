# MVP-017: Comments & Activity Log

## Description
Threaded comments with @mentions on tasks, rich text support, and a comprehensive activity log tracking all entity changes.

## Personas
- **Sarah (PM)**: Reviews comments for status updates
- **Elena (Customer)**: Communicates via task comments
- **Hana (Compliance)**: Needs immutable activity trail

## Dependencies
- MVP-012 (task CRUD)
- MVP-016 (attachments for comment file attachments)

## Scope

### API Endpoints — Comments
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/tasks/:taskId/comments` | Create comment |
| GET | `/api/v1/tasks/:taskId/comments` | List comments (threaded) |
| PATCH | `/api/v1/comments/:id` | Edit comment (author only) |
| DELETE | `/api/v1/comments/:id` | Soft-delete comment (author or admin) |

### API Endpoints — Activity Log
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tasks/:taskId/activity` | Get task activity log |
| GET | `/api/v1/projects/:projectId/activity` | Get project activity log |
| GET | `/api/v1/organizations/:orgId/activity` | Get org activity log (admin only) |

### Files to create
```
apps/api/src/
├── routes/comments/
│   ├── comments.routes.ts
│   ├── comments.handlers.ts
│   └── comments.schemas.ts
├── routes/activity/
│   ├── activity.routes.ts
│   ├── activity.handlers.ts
│   └── activity.schemas.ts
├── services/
│   ├── comment.service.ts
│   └── activity.service.ts    # ActivityLog writer (called from all services)
packages/shared/src/schemas/
└── comment.schema.ts
```

### Comment features
- **Threading**: `parent_comment_id` for replies (1 level only for MVP)
- **@mentions**: Parse `@username` in body, resolve to user IDs, trigger notifications
- **Rich text**: Body stored as HTML (sanitized). Frontend uses a rich text editor.
- **File attachments**: Link existing attachments to comments
- **Edit/delete**: Only the author can edit; author or admin can soft-delete

### Activity log
- **Immutable**: append-only, no updates or deletes
- **Comprehensive**: records every create, update, delete, assign, status_change, label_add, label_remove, comment_add, attachment_add
- **Changes field**: JSON with before/after values for each changed field
  ```json
  { "status": { "from": "To Do", "to": "In Progress" }, "assignee": { "from": null, "to": "Sarah" } }
  ```
- **actor_display**: denormalized display name for historical accuracy

### Activity service pattern
```typescript
// Called from any service after a mutation
await activityService.log({
  organizationId,
  actorId: currentUser.id,
  entityType: 'task',
  entityId: task.id,
  action: 'status_changed',
  changes: { status: { from: oldStatus, to: newStatus } },
});
```

### Mention parsing
- Regex: `@(\w+)` in comment body
- Resolve username to user ID within the organization
- Create notification for mentioned users (implemented in MVP-020)
- For MVP: store mention references; notification creation deferred to notification feature

## Acceptance Criteria
- [ ] Comments can be created on tasks
- [ ] Comments support threading (1 level deep)
- [ ] @mentions are parsed and resolved to user IDs
- [ ] Comment body is HTML-sanitized (no XSS)
- [ ] Comments can be edited by author only
- [ ] Comments can be soft-deleted by author or admin
- [ ] Activity log records all entity changes with before/after values
- [ ] Activity log is immutable (no update/delete endpoints)
- [ ] Activity log is paginated and filterable by entity
- [ ] actor_display is denormalized for historical accuracy
- [ ] Tests cover comment CRUD, threading, mentions, activity logging
- [ ] Organization membership changes (add, remove, role change) create activity log entries (from MVP-009)
- [ ] Project changes (CRUD, member changes, workflow/label changes) create activity log entries (from MVP-011)
- [ ] Task changes (CRUD, assign, status change, label add/remove) create activity log entries with before/after values (from MVP-012)
