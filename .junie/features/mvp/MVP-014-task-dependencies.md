# MVP-014: Tasks — Dependencies

## Description
Task dependency relationships (blocked by / blocks). Visual indicators show blocked tasks. Moving a blocking task to "done" unblocks dependents.

## Personas
- **Sarah (PM)**: Needs to see what's blocked and why
- **Derek (Workfront)**: Critical for project planning

## Dependencies
- MVP-012 (task CRUD)

## Scope

### API Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/tasks/:taskId/dependencies` | Add dependency (blocks or blocked_by) |
| GET | `/api/v1/tasks/:taskId/dependencies` | List dependencies (both directions) |
| DELETE | `/api/v1/task-dependencies/:id` | Remove dependency |

### Files to create/modify
```
apps/api/src/
├── routes/tasks/
│   └── dependencies.routes.ts, dependencies.handlers.ts, dependencies.schemas.ts
├── services/
│   └── dependency.service.ts
```

### Dependency rules
- A task can block multiple tasks and be blocked by multiple tasks
- Circular dependencies are rejected (A blocks B blocks A)
- Self-dependencies are rejected
- Cross-project dependencies are allowed (within same organization)
- When creating: `{ dependsOnTaskId: "task_123", type: "blocked_by" }`

### Blocked status detection
- A task is "blocked" if any of its `blocked_by` dependencies are not in a final workflow status
- The blocked state is derived, not stored — computed on read
- Task list responses include `isBlocked: boolean` and `blockedByCount: number`

### Circular dependency detection
On creating a new dependency, walk the dependency graph (BFS/DFS) to ensure no cycle is formed. Reject with 422 if circular.

## Acceptance Criteria
- [ ] Dependencies can be created (blocks / blocked_by)
- [ ] Dependencies can be listed for a task (both directions)
- [ ] Dependencies can be removed
- [ ] Circular dependencies are detected and rejected
- [ ] Self-dependencies are rejected
- [ ] Task response includes `isBlocked` and `blockedByCount` fields
- [ ] Cross-project dependencies work
- [ ] Activity log records dependency changes
- [ ] Tests cover creation, removal, circular detection, blocked status
