# MVP-032: Admin Auth Configuration

## Description
Allow organization admins to configure which authentication methods are enabled for their organization. Admins can toggle JWT (email/password), OAuth providers (Google, GitHub), and MFA enforcement independently. This gives organizations control over their security posture — e.g., an enterprise may enforce MFA and disable password login, while a small team may keep only email/password.

## Personas
- **Nadia (Security)**: Enforcing MFA, disabling weaker auth methods
- **Lars (Admin)**: Configuring org-level auth settings
- **Finn (Onboarding)**: Ensuring new users can still sign up when auth methods are restricted

## Dependencies
- MVP-006 (JWT auth)
- MVP-007 (OAuth login)
- MVP-008 (MFA)
- MVP-009 (Organizations)
- MVP-010 (Roles & Permissions — admin role required)

## Scope

### Data Model
- New `organization_auth_settings` table (or columns on `organizations`):
  - `password_auth_enabled` (boolean, default: true)
  - `google_oauth_enabled` (boolean, default: false)
  - `github_oauth_enabled` (boolean, default: false)
  - `mfa_enforced` (boolean, default: false) — all members must set up MFA
  - `allowed_email_domains` (JSON array, nullable) — restrict signup to specific domains

### API Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/organizations/:orgId/auth-settings` | Get current auth configuration |
| PATCH | `/api/v1/organizations/:orgId/auth-settings` | Update auth configuration (admin only) |

### Business Rules
- At least one auth method must remain enabled (prevent lockout)
- When MFA is enforced, existing members without MFA get a grace period (configurable, default 7 days) to set it up
- When an OAuth provider is disabled, existing sessions via that provider remain valid until expiry but cannot be renewed
- When password auth is disabled, password-based login returns 403 with a message pointing to enabled methods
- Login and registration flows check org auth settings before proceeding
- Super Admin can override settings for any organization

### Files to create/modify
```
apps/api/src/
├── services/
│   └── org-auth-settings.service.ts
├── routes/organizations/
│   ├── auth-settings.handlers.ts
│   └── auth-settings.schemas.ts
packages/db/src/schema/
│   └── organizations.ts          # Add auth_settings columns or related table
packages/shared/src/schemas/
│   └── org-auth-settings.schema.ts
```

## Acceptance Criteria
- [x] Admin can view current auth settings for their organization
- [x] Admin can enable/disable password authentication
- [x] Admin can enable/disable Google OAuth
- [x] Admin can enable/disable GitHub OAuth
- [x] Admin can enforce MFA for all organization members
- [x] Admin can restrict signup to specific email domains
- [x] Cannot disable all auth methods (at least one must remain enabled)
- [x] MFA enforcement grants a configurable grace period to existing members
- [x] Login/registration flows respect org auth settings
- [x] Non-admin users receive 403 when attempting to modify auth settings
- [x] Changes are audited in the activity log
- [x] Unit tests cover service-layer functions, validation schemas, and lockout prevention logic
