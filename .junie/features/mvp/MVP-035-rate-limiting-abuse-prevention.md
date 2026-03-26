# MVP-035: Rate Limiting & Abuse Prevention

## Description
Differentiated rate limits per route group, account lockout with progressive delay after failed login attempts, and basic abuse prevention for public-facing endpoints.

## Personas
- **Nadia (Security)**: Prevent brute force and automated abuse
- **Kai (Performance)**: Ensure legitimate users aren't throttled
- **Elena (Customer)**: Normal usage shouldn't trigger rate limits
- **Omar (Integration)**: API consumers need reasonable limits

## Dependencies
- MVP-005 (API server)
- MVP-006 (Auth — JWT)

## Scope

### Per-route rate limits
| Route Group | Limit | Window | Rationale |
|---|---|---|---|
| Auth (login, register, password reset) | 5 | 1 min | Brute force prevention |
| Auth (refresh token) | 10 | 1 min | Frequent but limited |
| Write endpoints (POST, PATCH, DELETE) | 30 | 1 min | Moderate write protection |
| Read endpoints (GET) | 120 | 1 min | Allow frequent reads |
| Search | 30 | 1 min | Meilisearch protection |
| File upload | 10 | 1 min | Resource-intensive |
| WebSocket connect | 5 | 1 min | Connection storm prevention |

### Account lockout
- Track consecutive failed login attempts per email in Redis
- After 5 failed attempts: 1 minute cooldown
- After 10 failed attempts: 5 minute cooldown
- After 20 failed attempts: 30 minute cooldown
- Successful login resets the counter
- Return generic "Invalid credentials" (don't reveal if account exists)

### Implementation
- Override `@fastify/rate-limit` config per route prefix
- Use Redis as rate limit store (shared across API instances)
- Failed login tracking via Redis key with TTL

## Acceptance Criteria
- [ ] Auth endpoints have stricter rate limits than general endpoints
- [ ] Read endpoints allow higher request rates
- [ ] Account lockout activates after 5 consecutive failed logins
- [ ] Lockout duration increases progressively
- [ ] Successful login resets lockout counter
- [ ] Rate limit headers are returned on all responses
- [ ] Tests cover rate limit differentiation and account lockout progression
