# MVP-008: Auth — MFA (TOTP)

## Description
Time-based One-Time Password (TOTP) multi-factor authentication. Users can enable MFA, scan a QR code with an authenticator app, and verify with a 6-digit code on login. Supports organization-wide MFA enforcement with configurable grace periods.

## Personas
- **Nadia (Security)**: MFA is critical for enterprise adoption
- **Hana (Compliance)**: Required for regulated environments

## Dependencies
- MVP-006 (JWT auth, User model with mfa_enabled, mfa_secret)

## Scope

### API Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/mfa/setup` | Generate TOTP secret + QR code URI |
| POST | `/api/v1/auth/mfa/verify-setup` | Verify first TOTP code, enable MFA |
| POST | `/api/v1/auth/mfa/verify` | Verify TOTP code during login |
| POST | `/api/v1/auth/mfa/disable` | Disable MFA (requires current TOTP code) |
| POST | `/api/v1/auth/mfa/reset-pending` | Reset pending MFA setup (requires password) |
| DELETE | `/api/v1/auth/mfa` | **Deprecated** — use POST /disable instead |

### Organization MFA Enforcement
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/organizations/:id/auth-settings` | Get org auth settings including MFA enforcement |
| PUT | `/api/v1/organizations/:id/auth-settings` | Update org auth settings (can enable mfaEnforced) |

### Security Overview
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/users/me/security` | Get user security status including MFA enforcement info |

### Modified Endpoints
| Method | Path | Change |
|---|---|---|
| POST | `/api/v1/auth/login` | Returns `mfaSetupRequired: true` when org enforces MFA but user hasn't set it up |
| POST | `/api/v1/auth/refresh` | Returns 403 with `MFA_ENFORCED_BY_ORG` when grace period expired |
| POST | `/api/v1/auth/oauth/:provider/callback` | Redirects to MFA setup when org enforces MFA during invitation flow |

### Flow
1. User calls `POST /mfa/setup` → server generates TOTP secret, returns `otpauth://` URI
2. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
3. User submits 6-digit code via `POST /mfa/verify-setup` → server verifies, sets `mfa_enabled=true`
4. On subsequent logins: after email/password verification, server returns `{ mfaRequired: true }`
5. Client shows TOTP input → user submits code via `POST /mfa/verify` → server issues full JWT

### Organization Enforcement Flow
1. Org admin calls `PUT /api/v1/organizations/:id/auth-settings` with `mfaEnforced: true`
2. System validates admin has MFA enabled on their own account (blocks otherwise)
3. Users in the org receive a grace period (default 7 days) to set up MFA
4. After grace period expires, users must complete MFA setup before accessing the app
5. Users cannot disable MFA while any org they belong to enforces it (regardless of grace period)

### Libraries
- `otpauth` for TOTP generation and verification
- TOTP window: 1 (allows ±30 second drift)
- Secret stored encrypted at rest (AES-256-GCM)

### Login flow modification
Modify `POST /auth/login` to:
1. Verify email + password
2. Check org MFA enforcement status
3. If org enforces MFA and grace period expired but user hasn't set up MFA: return `mfaSetupRequired: true`
4. If `mfa_enabled`: return 200 with `{ mfaRequired: true, mfaToken: "<short-lived-token>" }`
5. Client calls `POST /auth/mfa/verify` with mfaToken + TOTP code
6. If valid: return access + refresh tokens

### Error Codes
| Code | HTTP Status | Description |
|---|---|---|
| MFA_ENFORCED_BY_ORG | 403 | User cannot proceed because their organization enforces MFA and the grace period has expired |
| BAD_REQUEST | 400 | No pending MFA setup to reset |
| BAD_REQUEST | 400 | MFA is already enabled — use the disable flow instead |
| BAD_REQUEST | 400 | Self-service MFA reset is not available for OAuth-only users |
| BAD_REQUEST | 400 | Invalid password |
| UNAUTHORIZED | 401 | Not authenticated |
| NOT_FOUND | 404 | User not found |

### Reset Pending MFA
`POST /api/v1/auth/mfa/reset-pending` allows users to cancel a pending MFA setup flow. Use cases:
- User started MFA setup but wants to cancel before verifying the first code
- User wants to restart the setup process with a new authenticator

**Request Body:**
```json
{
  "password": "string (1-255 chars)"
}
```

**Success Response:** `200 { data: { message: "Pending MFA setup reset successfully" } }`

**Error Responses:**
- `400 BAD_REQUEST`: No pending MFA setup to reset
- `400 BAD_REQUEST`: MFA is already enabled — use the disable flow instead
- `400 BAD_REQUEST`: Self-service MFA reset is not available for OAuth-only users
- `400 BAD_REQUEST`: Invalid password
- `401 UNAUTHORIZED`: Not authenticated
- `404 NOT_FOUND`: User not found

### Deprecation Notice
- `DELETE /api/v1/auth/mfa` is deprecated. Use `POST /api/v1/auth/mfa/disable` instead.
- Sunset date: November 1, 2025
- Response includes `Deprecation`, `Sunset`, and `Link` headers pointing to the new endpoint

### Security Overview Response
`GET /api/v1/users/me/security` returns:
```
{
  "mfaEnabled": boolean,
  "mfaEnforcedByOrg": boolean,
  "mfaGracePeriodEndsAt": "2026-04-15T00:00:00.000Z" | null,
  "mfaSetupPending": boolean,
  "lastLoginAt": "2026-04-01T14:30:00.000Z" | null,
  "activeSessions": number
}
```

- `mfaEnforcedByOrg`: true if any org the user belongs to enforces MFA
- `mfaGracePeriodEndsAt`: ISO timestamp when the grace period ends (null if not enforced or grace expired)
- `mfaSetupPending`: true if user has a pending MFA secret awaiting verification

## Acceptance Criteria
- [x] User can set up MFA and receive a QR code URI
- [x] First TOTP code must be verified before MFA is enabled
- [x] Login flow correctly requires MFA when enabled
- [x] Invalid TOTP code returns 401
- [x] MFA can be disabled with a valid TOTP code
- [x] MFA secret is encrypted at rest (AES-256-GCM)
- [x] TOTP window allows ±30 second drift
- [x] Tests cover setup, verify, login with MFA, disable
- [x] Org admins can enforce MFA for their organization
- [x] Users receive a grace period when org enforces MFA
- [x] Users cannot disable MFA while org enforces it
- [x] Token refresh returns 403 when MFA is required but not set up
- [x] OAuth invitation flow redirects to MFA setup when org enforces MFA
