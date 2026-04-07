# MVP-011: Projects

## Description
Project CRUD, customizable status workflows per project, labels, and project membership. Projects are the main container for tasks.

## Personas
- **Sarah (PM)**: Creates and configures projects with custom workflows
- **Jordan (Team Lead)**: Manages project members and settings

## Dependencies
- MVP-009 (organizations)
- MVP-010 (roles & permissions)

## Scope

### API Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/organizations/:orgId/projects` | Create project |
| GET | `/api/v1/organizations/:orgId/projects` | List projects (paginated, filterable) |
| GET | `/api/v1/projects/:id` | Get project details |
| PATCH | `/api/v1/projects/:id` | Update project |
| POST | `/api/v1/projects/:id/archive` | Archive project |
| DELETE | `/api/v1/projects/:id` | Soft-delete project |
| GET | `/api/v1/projects/:id/members` | List project members |
| POST | `/api/v1/projects/:id/members` | Add member to project |
| PATCH | `/api/v1/projects/:id/members/:memberId` | Change project role |
| DELETE | `/api/v1/projects/:id/members/:memberId` | Remove from project |
| GET | `/api/v1/projects/:id/workflows` | Get project workflow + statuses |
| POST | `/api/v1/projects/:id/workflows` | Create custom workflow |
| PATCH | `/api/v1/projects/:id/workflow-statuses/:statusId` | Update status (name, color, position) |
| POST | `/api/v1/projects/:id/workflow-statuses` | Add status to workflow |
| DELETE | `/api/v1/projects/:id/workflow-statuses/:statusId` | Remove status (only if no tasks use it) |
| GET | `/api/v1/projects/:id/labels` | List labels |
| POST | `/api/v1/projects/:id/labels` | Create label |
| PATCH | `/api/v1/projects/:id/labels/:labelId` | Update label |
| DELETE | `/api/v1/projects/:id/labels/:labelId` | Delete label |

### Files to create
```
apps/api/src/
├── routes/projects/
│   ├── projects.routes.ts
│   ├── projects.handlers.ts
│   └── projects.schemas.ts
├── services/
│   ├── project.service.ts
│   ├── workflow.service.ts
│   └── label.service.ts
packages/shared/src/schemas/
└── project.schema.ts
```

### Default workflow
On project creation, auto-create a default workflow with 4 statuses:
1. To Do (is_initial: true, color: gray, position: 0)
2. In Progress (color: blue, position: 1)
3. Review (color: yellow, position: 2)
4. Done (is_final: true, color: green, position: 3)

### Project slug
- Auto-generated from name (e.g., "My Project" → "my-project")
- Unique within organization
- Used in URLs

### Filtering
- `GET /projects?status=active` — filter by status
- `GET /projects?search=keyword` — search by name/description
- Sorted by name (default) or created_at

## Acceptance Criteria
- [x] Project CRUD works with proper permission checks
- [x] Default workflow is auto-created with 4 statuses
- [x] Custom workflow statuses can be added, reordered, renamed, and removed
- [x] Cannot delete a status that has tasks assigned to it
- [x] Labels CRUD works
- [x] Project members can be managed with project-specific roles
- [x] Project archival sets status to "archived" (tasks remain accessible)
- [x] Soft-delete sets deleted_at (filterable)
- [x] Project slug is unique within organization
- [x] ~~All changes create activity log entries~~ → deferred to MVP-017
- [x] Tests cover CRUD, workflow management, membership, permission checks
