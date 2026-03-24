# MVP-007: Auth — OAuth 2.0 / OIDC

## Description
Social login via Google and GitHub using OpenID Connect. Links OAuth accounts to existing users or creates new accounts.

## Personas
- **Finn (Onboarding)**: One-click signup reduces friction
- **Nadia (Security)**: Proper PKCE flow, secure token exchange

## Dependencies
- MVP-006 (JWT auth, User service)

## Scope

### API Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/auth/oauth/:provider` | Redirect to provider auth URL (Google, GitHub) |
| GET | `/api/v1/auth/oauth/:provider/callback` | Handle provider callback, create/link account, return tokens |

### Files to create/modify
```
apps/api/src/
├── services/
│   └── oauth.service.ts          # Provider config, token exchange, user creation/linking
├── routes/auth/
│   ├── oauth.routes.ts
│   ├── oauth.handlers.ts
│   └── oauth.schemas.ts
```

### Flow
1. Client calls `GET /api/v1/auth/oauth/google` with `redirectUri` query param
2. Server generates state + PKCE code verifier, stores in short-lived Redis key
3. Server redirects to Google/GitHub authorization URL
4. Provider redirects back to callback URL with code
5. Server exchanges code for tokens via openid-client
6. Server extracts user info (email, name, avatar) from ID token
7. If email matches existing user → link OAuthAccount, issue JWT
8. If no existing user → create User + OAuthAccount, issue JWT
9. Redirect to frontend with access token (via URL fragment or secure cookie)

### Provider configuration
- Google: OIDC discovery URL, client_id, client_secret
- GitHub: OAuth 2.0 (not full OIDC), userinfo endpoint for email/name
- Config via environment variables: `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET`, etc.

## Acceptance Criteria
- [ ] Google login creates new account or links to existing
- [ ] GitHub login creates new account or links to existing
- [ ] PKCE is used for all OAuth flows
- [ ] State parameter prevents CSRF
- [ ] Duplicate email (existing account) links OAuth account rather than creating duplicate
- [ ] JWT tokens are issued after successful OAuth login
- [ ] Invalid/expired OAuth callbacks return appropriate errors
- [ ] Provider configuration is read from environment variables
- [ ] Tests cover happy path and error cases (invalid state, expired code)
