# MVP-038: Session Invalidation on Password Change

## Description
When a user changes their password, all other active sessions are immediately invalidated. The current session (used to perform the password change) remains active.

## Personas
- **Nadia (Security)**: Compromised sessions must be terminated on password change
- **Sarah (PM)**: Users expect password changes to log out other devices

## Dependencies
- MVP-006 (Auth — JWT)

## Scope

### Implementation
- On password change, delete all rows from `sessions` table for the user EXCEPT the current session
- The current session is identified by the `sessionId` in the JWT payload
- Optionally: also revoke all refresh tokens except the current one
- Return a warning in the response: `{ message: "Password changed. All other sessions have been signed out." }`

### Edge cases
- If the user changes password via a "forgot password" flow (no current session), invalidate ALL sessions
- MFA-protected password change should still invalidate other sessions after MFA verification

## Acceptance Criteria
- [ ] Password change invalidates all other active sessions
- [ ] The current session remains active after password change
- [ ] Forgot-password flow invalidates all sessions
- [ ] Refresh tokens for other sessions are revoked
- [ ] Tests cover session cleanup on password change
