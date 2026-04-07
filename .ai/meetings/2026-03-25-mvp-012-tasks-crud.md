# MVP-012: Tasks CRUD — Persona Meeting

**Date**: 2026-03-25
**Attendees**: Sarah (PM), Marcus (Backend Dev), Priya (Frontend Dev), Jordan (Team Lead), Kai (Performance), Tara (Unit Tests)

## Discussion Summary

### Sarah (PM)
- Tasks are the core of everything. Need to create tasks fast — often just a title — and fill in details later.
- Filtering by status + assignee combo is the daily workflow for standup prep.
- Position/reorder must work smoothly for sprint planning on the Kanban board.

### Marcus (Backend)
- Gap-based positioning: 1000-interval gaps, midpoint for inserts, rebalance when gap < 1.
- Status validation: on update, verify statusId belongs to the project's workflow.
- Assignee validation: assignee must be an org member (not necessarily project member).

### Priya (Frontend)
- Need rich filtering — multiple statuses, multiple labels, date ranges.
- Sort needs to support `position` as primary sort for Kanban columns.
- Response should include assignee display name and status name to avoid extra lookups.

### Jordan (Team Lead)
- Permission model: `task:create` for creation, `task:read` for reading, `task:update` for modification, `task:delete` for soft-delete.

### Kai (Performance)
- List endpoint will be the most-hit endpoint. Use DB-level filtering, not in-memory.
- `tasks_project_status_idx` index covers the primary Kanban query.
- For search, use title-only LIKE for MVP (Meilisearch comes later).

### Tara (Unit Tests)
- Schema validation tests for all Zod schemas (boundary tests).
- Test priority enum validation, date format validation, position constraints.

## Decisions

1. **Gap-based positioning**: 1000-interval gaps, shift on insert, rebalance deferred
2. **Default status**: Use workflow's `isInitial` status when no statusId provided
3. **Assignee validation**: Verify assignee is an org member (any org user can be assigned)
4. **Status validation**: Verify statusId belongs to project's workflow
5. **Search**: Title-only in-memory filter for MVP (Meilisearch in later feature)
6. **Labels on create**: Accept optional `labelIds` array, attach in same operation
7. **Watcher auto-add**: Reporter and assignee are auto-added as watchers on create
8. **Activity logging**: Deferred to MVP-017
