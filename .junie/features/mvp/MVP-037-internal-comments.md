# MVP-037: Internal Comments

## Description
Add comment visibility control so team members can leave internal-only comments that are hidden from customers/guests. Internal comments are filtered at the service layer to ensure they cannot be accessed via the API by unauthorized roles.

## Personas
- **Elena (Customer)**: Should only see public comments meant for her
- **Jordan (Team Lead)**: Needs to discuss approach and timeline internally before responding
- **Nadia (Security)**: Filter must be at service layer, not just frontend
- **Hana (Compliance)**: Audit trail should still capture internal comments

## Dependencies
- MVP-017 (Comments & Activity Log)
- MVP-010 (Roles & Permissions)

## Scope

### Schema change
- Add `visibility` column to `comments` table: `'public' | 'internal'`, default `'public'`

### API changes
- POST `/api/v1/comments` — accept optional `visibility` field (default: `public`)
- GET comment listing — filter out `internal` comments when requesting user has Guest/Customer role
- GET single comment — return 404 for internal comments when user is Guest/Customer
- Activity log entries for internal comments are hidden from Guest/Customer users

### Authorization rules
- Only users with Team Member role or higher can create internal comments
- Guest/Customer users always see `visibility: 'public'` comments only
- Admin can see all comments regardless

### Notification filtering
- @mentions in internal comments do NOT send notifications to Guest/Customer users
- Internal comment creation does NOT trigger activity log entries visible to Guest/Customer users

## Acceptance Criteria
- [x] Comments can be created with `visibility: 'internal'`
- [x] Guest/Customer users cannot see internal comments via API
- [x] Guest/Customer users cannot create internal comments
- [x] Activity log hides internal comment entries from Guest/Customer users
- [x] @mentions in internal comments don't notify Guest/Customer users
- [x] Audit trail still records internal comments
- [x] Tests cover visibility filtering for different roles
