# MVP-013: Tasks — Subtasks & Checklists

## Description
Subtasks (tasks with a parent_task_id) and checklists within tasks. Subtasks are full tasks; checklists are lightweight to-do lists.

## Personas
- **Sarah (PM)**: Breaks work into smaller pieces
- **Derek (Workfront)**: Expects hierarchical task decomposition

## Dependencies
- MVP-012 (task CRUD)

## Scope

### API Endpoints — Subtasks
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/tasks/:taskId/subtasks` | Create subtask (creates task with parent_task_id) |
| GET | `/api/v1/tasks/:taskId/subtasks` | List subtasks |

Subtasks are regular tasks with `parent_task_id` set. All task endpoints (CRUD, assign, labels, etc.) work on subtasks.

### API Endpoints — Checklists
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/tasks/:taskId/checklists` | Create checklist |
| GET | `/api/v1/tasks/:taskId/checklists` | List checklists with items |
| PATCH | `/api/v1/checklists/:id` | Update checklist (title, position) |
| DELETE | `/api/v1/checklists/:id` | Delete checklist |
| POST | `/api/v1/checklists/:id/items` | Add item |
| PATCH | `/api/v1/checklist-items/:id` | Update item (title, is_completed, position) |
| DELETE | `/api/v1/checklist-items/:id` | Delete item |

### Files to create/modify
```
apps/api/src/
├── routes/tasks/
│   └── subtasks.routes.ts, subtasks.handlers.ts, subtasks.schemas.ts
├── routes/checklists/
│   ├── checklists.routes.ts
│   ├── checklists.handlers.ts
│   └── checklists.schemas.ts
├── services/
│   └── checklist.service.ts
```

### Subtask rules
- Max 1 level of nesting (subtask cannot have subtasks)
- Subtasks inherit project from parent
- Subtasks can have independent status, assignee, priority, due date
- Parent task progress: calculate % from subtask completion (for display only)

### Checklist rules
- Multiple checklists per task
- Items are reorderable (position field)
- Completing an item sets `completed_by` and `completed_at`
- Checklist progress: X/Y items completed (for display)

## Acceptance Criteria
- [x] Subtasks can be created under a parent task
- [x] Subtasks appear in parent task's subtask list
- [x] Subtasks cannot be nested further (max 1 level)
- [x] Checklists can be created, updated, and deleted
- [x] Checklist items can be added, reordered, completed, and deleted
- [x] Completing an item records who completed it and when
- [x] Parent task shows subtask completion count and checklist progress
- [x] ~~Activity log records subtask and checklist changes~~ → deferred to MVP-017
- [x] Tests cover subtask creation, checklist CRUD, item completion
