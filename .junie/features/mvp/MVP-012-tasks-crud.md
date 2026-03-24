# MVP-012: Tasks — CRUD

## Description
Core task create, read, update, delete, and assignment. This is the heart of TaskForge.

## Personas
- **Sarah (PM)**: Creates and assigns tasks daily
- **Priya (Frontend)**, **Marcus (Backend)**: Work on assigned tasks

## Dependencies
- MVP-011 (projects, workflows, statuses)

## Scope

### API Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/projects/:projectId/tasks` | Create task |
| GET | `/api/v1/projects/:projectId/tasks` | List tasks (paginated, filterable, sortable) |
| GET | `/api/v1/tasks/:id` | Get task details |
| PATCH | `/api/v1/tasks/:id` | Update task |
| DELETE | `/api/v1/tasks/:id` | Soft-delete task |
| POST | `/api/v1/tasks/:id/assign` | Assign task to user |
| POST | `/api/v1/tasks/:id/watch` | Add current user as watcher |
| DELETE | `/api/v1/tasks/:id/watch` | Remove current user as watcher |
| GET | `/api/v1/tasks/:id/labels` | Get task labels |
| POST | `/api/v1/tasks/:id/labels` | Add label to task |
| DELETE | `/api/v1/tasks/:id/labels/:labelId` | Remove label from task |
| PATCH | `/api/v1/tasks/:id/position` | Reorder task (change position within status column) |

### Files to create
```
apps/api/src/
├── routes/tasks/
│   ├── tasks.routes.ts
│   ├── tasks.handlers.ts
│   └── tasks.schemas.ts
├── services/
│   └── task.service.ts
packages/shared/src/schemas/
└── task.schema.ts
```

### Task creation
Required fields: `title`, `projectId`
Optional fields: `description`, `statusId` (defaults to initial status), `priority` (defaults to none), `assigneeId`, `due_date`, `start_date`, `estimated_hours`, `labels`

### Filtering (GET /projects/:projectId/tasks)
| Parameter | Type | Description |
|---|---|---|
| status | string[] | Filter by status ID(s) |
| priority | string[] | Filter by priority |
| assigneeId | string | Filter by assignee |
| labelId | string[] | Filter by label(s) |
| dueDateFrom | date | Due date range start |
| dueDateTo | date | Due date range end |
| search | string | Full-text search on title/description |
| sort | string | Sort field (position, dueDate, priority, createdAt) |
| order | string | asc or desc |

### Reordering
`PATCH /tasks/:id/position` with `{ position: number, statusId?: string }`
- If `statusId` is provided, moves task to new status column
- Updates position for all affected tasks in the same column
- Uses gap-based positioning (e.g., 1000, 2000, 3000) to minimize cascading updates

### Activity logging
Every task change (create, update, assign, status change, label add/remove) creates an ActivityLog entry with before/after values.

## Acceptance Criteria
- [ ] Tasks can be created with required and optional fields
- [ ] Task defaults to initial workflow status when no statusId provided
- [ ] Tasks can be read individually and as paginated lists
- [ ] Filtering works for all parameters including combinations
- [ ] Sorting works for position, dueDate, priority, createdAt
- [ ] Tasks can be updated (partial updates via PATCH)
- [ ] Status changes are validated against the project's workflow
- [ ] Tasks can be assigned and unassigned
- [ ] Watchers can be added and removed
- [ ] Labels can be added and removed
- [ ] Position/reordering works correctly including cross-column moves
- [ ] Soft-delete sets deleted_at
- [ ] All changes create activity log entries with before/after values
- [ ] Permission checks enforce role-based access
- [ ] Tests cover CRUD, filtering, sorting, reordering, permission checks
