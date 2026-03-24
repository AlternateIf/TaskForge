# MVP-009: Organizations & Membership

## Description
Organization CRUD, membership management, and trial signup flow. An organization is the top-level tenant — all projects, roles, and data are scoped to it.

## Personas
- **Jordan (Team Lead)**: Creates and configures organizations
- **Victor (Sales)**: Trial signup needs to be frictionless
- **Finn (Onboarding)**: Minimal setup wizard

## Dependencies
- MVP-006 (auth, user model)
- MVP-004 (Organization, OrganizationMember schema)

## Scope

### API Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/organizations` | Create organization (+ auto-add creator as Super Admin) |
| GET | `/api/v1/organizations` | List user's organizations |
| GET | `/api/v1/organizations/:id` | Get organization details |
| PATCH | `/api/v1/organizations/:id` | Update organization (name, logo, settings) |
| DELETE | `/api/v1/organizations/:id` | Soft-delete organization (Super Admin only) |
| GET | `/api/v1/organizations/:id/members` | List members |
| POST | `/api/v1/organizations/:id/members` | Invite member (by email) |
| PATCH | `/api/v1/organizations/:id/members/:memberId` | Change member role |
| DELETE | `/api/v1/organizations/:id/members/:memberId` | Remove member |

### Files to create
```
apps/api/src/
├── routes/organizations/
│   ├── organizations.routes.ts
│   ├── organizations.handlers.ts
│   └── organizations.schemas.ts
├── services/
│   └── organization.service.ts
packages/shared/src/schemas/
└── organization.schema.ts
```

### Trial signup flow
On `POST /organizations`:
1. Create organization with `trial_expires_at` set to 14 days from now
2. Auto-create built-in roles (Super Admin, Admin, PM, Team Member, Guest)
3. Add creator as Super Admin member
4. Return organization with setup wizard state

### Organization settings (JSON)
```json
{
  "defaultProjectWorkflow": ["To Do", "In Progress", "Review", "Done"],
  "timezone": "UTC",
  "dateFormat": "YYYY-MM-DD"
}
```

### Member invitation
- For MVP: direct add by email (if user exists) or pending invitation
- Invitation creates a NotificationPreference entry
- Activity log entry for all membership changes

## Acceptance Criteria
- [ ] User can create an organization
- [ ] Creator is automatically Super Admin
- [ ] Built-in roles are auto-created
- [ ] Organization has trial_expires_at set
- [ ] Members can be listed, added, role-changed, and removed
- [ ] Only Super Admin can delete organization
- [ ] Soft-delete (deleted_at) preserves data
- [ ] Organization slug is unique and auto-generated from name
- [ ] All membership changes create activity log entries
- [ ] Tests cover CRUD, membership management, permission checks
