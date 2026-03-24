# MVP-019: Search & Filtering

## Description
Full-text search powered by Meilisearch, advanced filtering across multiple parameters, and saved filter presets.

## Personas
- **Sarah (PM)**: Quickly finds tasks by keyword
- **Tomás (Evaluation)**: Needs structured filtering for report queries
- **Derek (Workfront)**: Expects powerful search across all content

## Dependencies
- MVP-012 (task CRUD — data to index)
- MVP-018 (RabbitMQ — for async index sync)
- MVP-002 (Meilisearch container)

## Scope

### API Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/search` | Global search across tasks, projects, comments |
| GET | `/api/v1/projects/:projectId/tasks` | Task list with filtering (already exists, add filter support) |
| POST | `/api/v1/saved-filters` | Save a filter preset |
| GET | `/api/v1/saved-filters` | List saved filter presets |
| PATCH | `/api/v1/saved-filters/:id` | Update preset |
| DELETE | `/api/v1/saved-filters/:id` | Delete preset |

### Files to create
```
apps/api/src/
├── services/
│   └── search.service.ts         # Meilisearch client, index management, search queries
├── routes/search/
│   ├── search.routes.ts
│   ├── search.handlers.ts
│   └── search.schemas.ts
├── routes/saved-filters/
│   ├── saved-filters.routes.ts
│   ├── saved-filters.handlers.ts
│   └── saved-filters.schemas.ts
├── queues/handlers/
│   └── search-index.handler.ts   # Update Meilisearch on entity changes
```

### Meilisearch indexes

**tasks index:**
- Fields: id, title, description, status, statusName, priority, assigneeId, assigneeName, labels, projectId, projectName, dueDate, createdAt
- Searchable: title, description
- Filterable: status, priority, assigneeId, labels, projectId, dueDate
- Sortable: dueDate, priority, createdAt

**projects index:**
- Fields: id, name, description, status
- Searchable: name, description

**comments index:**
- Fields: id, body, authorId, authorName, taskId, projectId, createdAt
- Searchable: body

### Index synchronization
On task/project/comment create/update/delete:
1. API service publishes `search.index` event to RabbitMQ
2. Worker's `search-index.handler.ts` receives event
3. Handler fetches latest entity data from DB
4. Upserts or deletes document in Meilisearch

### Global search endpoint
```
GET /api/v1/search?q=login+bug&type=task,comment&projectId=proj_123
```
Response:
```json
{
  "data": {
    "tasks": { "hits": [...], "totalHits": 5 },
    "projects": { "hits": [...], "totalHits": 1 },
    "comments": { "hits": [...], "totalHits": 3 }
  }
}
```

### Saved filter presets
```json
{
  "name": "My overdue tasks",
  "entityType": "task",
  "filters": {
    "assigneeId": "me",
    "dueDateTo": "today",
    "status": ["open", "in_progress"]
  }
}
```
- Scoped to user + organization
- "me" and "today" are dynamic values resolved at query time

## Acceptance Criteria
- [ ] Meilisearch indexes are created on application start
- [ ] Tasks, projects, and comments are indexed on create/update
- [ ] Deleted entities are removed from index
- [ ] Global search returns results across all types
- [ ] Search results respect permission checks (user can only see searchable entities)
- [ ] Task list filtering works for all parameters (status, priority, assignee, labels, date range)
- [ ] Saved filter presets can be created, listed, updated, and deleted
- [ ] Dynamic values ("me", "today") resolve correctly at query time
- [ ] Search is fast (<100ms for typical queries)
- [ ] Tests cover indexing, search, filtering, saved presets
