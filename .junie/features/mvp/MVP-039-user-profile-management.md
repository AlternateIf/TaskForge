# MVP-039: User Profile Management

## Description
Allow users to view and update their profile information (display name, avatar). Provide account-level settings management.

## Personas
- **Finn (Onboarding)**: Wants to personalize their account after signup
- **Yuki (Freelancer)**: Needs a professional display name and avatar for client-facing work
- **Elena (Customer)**: Wants to update how her name appears in comments

## Dependencies
- MVP-006 (Auth — JWT)
- MVP-016 (File Uploads — for avatar)

## Scope

### API Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/users/me` | Get current user's profile |
| PATCH | `/api/v1/users/me` | Update profile (displayName, avatar) |
| DELETE | `/api/v1/users/me` | Request account deletion |

### Updatable fields
- `displayName` — string, 1-100 chars
- `avatarUrl` — via file upload, stored as attachment

### Account deletion
- Soft-delete: set `deletedAt` timestamp
- Anonymize PII after a configurable grace period (30 days)
- During grace period, user can contact support to restore
- Immediate: invalidate all sessions, revoke tokens

## Acceptance Criteria
- [ ] User can view their profile via GET /users/me
- [ ] User can update display name
- [ ] User can upload/change avatar
- [ ] Account deletion soft-deletes and invalidates sessions
- [ ] Tests cover profile read, update, and deletion
