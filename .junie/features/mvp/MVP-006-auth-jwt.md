# MVP-006: Auth — Registration & JWT

## Description
User registration, login, JWT access/refresh token flow, email verification, password reset, and session management. This is the auth foundation that all other features depend on.

## Personas
- **Nadia (Security)**: Secure token handling, bcrypt hashing, HTTP-only refresh cookies
- **Finn (Onboarding)**: Simple registration flow

## Dependencies
- MVP-004 (User, Session schema)
- MVP-005 (API server, error handling)

## Scope

### API Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create account (email, password, display_name) |
| POST | `/api/v1/auth/login` | Login, return access token + set refresh cookie |
| POST | `/api/v1/auth/refresh` | Exchange refresh token for new access token |
| POST | `/api/v1/auth/logout` | Invalidate session, clear refresh cookie |
| POST | `/api/v1/auth/forgot-password` | Send password reset email |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| POST | `/api/v1/auth/verify-email` | Verify email with token |
| GET | `/api/v1/users/me` | Get current user profile |
| PATCH | `/api/v1/users/me` | Update profile (display_name, avatar_url) |
| PATCH | `/api/v1/users/me/password` | Change password (invalidates all other sessions) |

### Files to create
```
apps/api/src/
├── plugins/
│   └── auth.plugin.ts           # JWT verification decorator, extract user from token
├── routes/auth/
│   ├── auth.routes.ts
│   ├── auth.handlers.ts
│   └── auth.schemas.ts          # Zod schemas for register, login, etc.
├── routes/users/
│   ├── users.routes.ts
│   ├── users.handlers.ts
│   └── users.schemas.ts
├── services/
│   ├── auth.service.ts           # Registration, login, token generation, password reset
│   └── user.service.ts           # Profile CRUD
packages/shared/src/
├── schemas/
│   └── user.schema.ts            # Shared Zod schemas (registerInput, loginInput, userOutput)
```

### Token strategy
- **Access token**: JWT, 15-minute expiry, contains user_id and organization memberships
- **Refresh token**: opaque token stored as Session in DB, 7-day expiry, sent as HTTP-only secure cookie
- Password hashing: bcrypt with cost factor 12
- On password change: delete all sessions except current → forces re-login on other devices

### Validation
- Email: valid format, unique
- Password: min 8 characters, at least 1 uppercase, 1 lowercase, 1 number
- Display name: 2-100 characters

### Email sending
- Enqueue email jobs to RabbitMQ (implemented in MVP-018, for now log to console)
- Verification token: random 32-byte hex, expires in 24 hours
- Password reset token: random 32-byte hex, expires in 1 hour

## Acceptance Criteria
- [ ] User can register with email and password
- [ ] Duplicate email returns 409 CONFLICT
- [ ] Login returns JWT access token and sets refresh cookie
- [ ] Invalid credentials return 401
- [ ] Access token expires after 15 minutes
- [ ] Refresh token returns new access token
- [ ] Expired refresh token returns 401
- [ ] Logout invalidates session and clears cookie
- [ ] Password change invalidates all other sessions
- [ ] Protected endpoints return 401 without token
- [ ] User profile can be read and updated
- [ ] All auth endpoints have Zod validation
- [ ] Passwords are bcrypt hashed (never stored in plain text)
- [ ] Tests cover registration, login, refresh, logout, password change
