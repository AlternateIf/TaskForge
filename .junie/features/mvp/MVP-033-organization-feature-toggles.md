# MVP-033: Organization Feature Toggles

## Description
Allow organization admins to enable/disable optional features (notifications, file uploads, search, etc.) per organization. The API exposes enabled features, and the frontend conditionally renders UI based on the response.

## Personas
- **Finn (Onboarding)**: New users are overwhelmed when everything is on by default
- **Jordan (Team Lead)**: Needs to configure the workspace for the team's workflow
- **Nadia (Security)**: Feature toggles must be admin-only, no privilege escalation

## Dependencies
- MVP-009 (Organizations)
- MVP-010 (Roles & Permissions)

## Scope

### API Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/organizations/:orgId/features` | Get enabled features for the organization |
| PATCH | `/api/v1/organizations/:orgId/features` | Update feature toggles (Admin only) |

### Toggleable features (MVP)
| Feature Key | Default | Description |
|---|---|---|
| `notifications` | enabled | In-app and email notifications |
| `file_uploads` | enabled | File attachments on tasks/comments |
| `search` | enabled | Full-text search via Meilisearch |
| `comments` | enabled | Task comments and @mentions |
| `subtasks` | enabled | Subtasks and checklists |
| `dependencies` | enabled | Task dependency tracking |
| `mfa` | enabled | Multi-factor authentication |

### Implementation
- Add `features` JSONB/JSON column to the `organizations` table (or a separate `organization_settings` table)
- Default: all features enabled
- API middleware checks feature status before allowing access to feature-specific endpoints (e.g., if `file_uploads` is disabled, attachment endpoints return 403)
- Frontend reads features on app init and conditionally renders UI

## Acceptance Criteria
- [ ] Admin can toggle features on/off per organization
- [ ] Non-admin users cannot modify feature toggles
- [ ] Disabled features return 403 from their API endpoints
- [ ] GET endpoint returns current feature state with defaults for missing keys
- [ ] Tests cover toggle, access control, and middleware filtering
