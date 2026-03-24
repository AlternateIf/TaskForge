# MVP-008: Auth — MFA (TOTP)

## Description
Time-based One-Time Password (TOTP) multi-factor authentication. Users can enable MFA, scan a QR code with an authenticator app, and verify with a 6-digit code on login.

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
| DELETE | `/api/v1/auth/mfa` | Disable MFA (requires current TOTP code) |

### Files to create/modify
```
apps/api/src/
├── services/
│   └── mfa.service.ts            # TOTP secret generation, QR URI, verification
├── routes/auth/
│   └── mfa.routes.ts, mfa.handlers.ts, mfa.schemas.ts
```

### Flow
1. User calls `POST /mfa/setup` → server generates TOTP secret, returns `otpauth://` URI
2. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
3. User submits 6-digit code via `POST /mfa/verify-setup` → server verifies, sets `mfa_enabled=true`
4. On subsequent logins: after email/password verification, server returns `{ mfaRequired: true }`
5. Client shows TOTP input → user submits code via `POST /mfa/verify` → server issues full JWT

### Libraries
- `otpauth` or `speakeasy` for TOTP generation and verification
- TOTP window: 1 (allows ±30 second drift)
- Secret stored encrypted in `mfa_secret` column

### Login flow modification
Modify `POST /auth/login` to:
1. Verify email + password
2. If `mfa_enabled`: return 200 with `{ mfaRequired: true, mfaToken: "<short-lived-token>" }`
3. Client calls `POST /auth/mfa/verify` with mfaToken + TOTP code
4. If valid: return access + refresh tokens

## Acceptance Criteria
- [x] User can set up MFA and receive a QR code URI
- [x] First TOTP code must be verified before MFA is enabled
- [x] Login flow correctly requires MFA when enabled
- [x] Invalid TOTP code returns 401
- [x] MFA can be disabled with a valid TOTP code
- [x] MFA secret is encrypted at rest (AES-256-GCM)
- [x] TOTP window allows ±30 second drift
- [x] Tests cover setup, verify, login with MFA, disable
