# MVP-015: Tasks — Bulk Actions & Undo

## Description
Bulk operations on multiple tasks (assign, move, change status, delete) and undo support for accidental single-task actions.

## Personas
- **Sarah (PM)**: Reassigns multiple tasks at once during sprint changes
- **Finn (Onboarding)**: Undo prevents fear of making mistakes

## Dependencies
- MVP-012 (task CRUD)

## Scope

### API Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/tasks/bulk` | Bulk action on multiple tasks |

### Bulk actions
```json
// Change status
{ "action": "updateStatus", "ids": ["id1", "id2"], "data": { "statusId": "abc" } }

// Assign
{ "action": "assign", "ids": ["id1", "id2"], "data": { "assigneeId": "user_123" } }

// Change priority
{ "action": "updatePriority", "ids": ["id1", "id2"], "data": { "priority": "high" } }

// Add label
{ "action": "addLabel", "ids": ["id1", "id2"], "data": { "labelId": "label_123" } }

// Delete
{ "action": "delete", "ids": ["id1", "id2"] }

// Move to project
{ "action": "moveToProject", "ids": ["id1", "id2"], "data": { "projectId": "proj_123" } }
```

### Bulk response
```json
{
  "data": {
    "succeeded": ["id1", "id2"],
    "failed": [{ "id": "id3", "error": { "code": "FORBIDDEN", "message": "..." } }]
  },
  "meta": { "total": 3, "succeeded": 2, "failed": 1 }
}
```

### Undo support (API side)
- Each mutating task action returns an `undoToken` in the response
- `POST /api/v1/tasks/undo` with `{ undoToken }` reverses the action
- Undo tokens expire after 30 seconds
- Stored in Redis: `undo:<token>` → `{ action, entityId, previousState }`
- Only the user who performed the action can undo it
- Supports: status change, assignment, priority change, label add/remove, position change

### Files to create/modify
```
apps/api/src/
├── routes/tasks/
│   └── bulk.routes.ts, bulk.handlers.ts, bulk.schemas.ts
├── services/
│   └── undo.service.ts        # Store/retrieve undo state in Redis
```

### Limits
- Max 100 tasks per bulk request
- Each task is permission-checked individually
- Partial success: some may succeed while others fail

## Acceptance Criteria
- [ ] Bulk status change works on multiple tasks
- [ ] Bulk assign works
- [ ] Bulk priority change works
- [ ] Bulk label add works
- [ ] Bulk delete works (soft delete)
- [ ] Bulk move to project works
- [ ] Max 100 items enforced
- [ ] Partial success: individual permission checks per task
- [ ] Response reports succeeded and failed items separately
- [ ] Each individual task change returns an undoToken
- [ ] Undo reverses the action within 30 seconds
- [ ] Expired undo tokens return 410 GONE
- [ ] Activity log records each individual change in bulk
- [ ] Tests cover each bulk action, partial failure, undo
