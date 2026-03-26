# MVP-034: Environment Configuration Hardening

## Description
Ensure all configurable values used in the codebase are documented in `.env.example`, add SMTP TLS support for production email providers, and verify all external service connections work with both self-hosted and managed/cloud instances.

## Personas
- **Sam (DevOps)**: Needs complete env documentation for deployment
- **Dana (Systems)**: Must configure for different environments (dev, staging, prod)
- **Marcus (Backend)**: Needs TLS support for production SMTP

## Dependencies
- MVP-005 (API server)

## Scope

### Missing env vars to add to .env.example
```env
# Server
HOST=0.0.0.0

# URLs
APP_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Secrets
COOKIE_SECRET=dev-cookie-secret-change-in-production
MFA_ENCRYPTION_KEY=dev-mfa-key-change-in-production-32ch

# Email (extended)
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
EMAIL_FROM=TaskForge <noreply@taskforge.dev>

# Uploads
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_BYTES=52428800

# Logging
LOG_LEVEL=info

# Meilisearch
MEILISEARCH_API_KEY=taskforge-dev-key

# OAuth (optional)
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_GITHUB_CLIENT_ID=
OAUTH_GITHUB_CLIENT_SECRET=
```

### SMTP TLS support
- Add `SMTP_SECURE` env var (boolean, defaults to `false`)
- When `true`, use TLS connection to SMTP server
- Add `SMTP_TLS_REJECT_UNAUTHORIZED` for self-signed cert environments

### Cloud service compatibility verification
- All service URLs (DATABASE_URL, REDIS_URL, RABBITMQ_URL, MEILISEARCH_URL) already accept full connection strings
- Document which cloud providers are compatible (CloudAMQP, Redis Cloud, PlanetScale, Meilisearch Cloud)

## Acceptance Criteria
- [x] `.env.example` contains every `process.env` variable used in the codebase
- [x] Each variable has a comment explaining its purpose and default
- [x] SMTP TLS support works with production email providers (e.g., SES, SendGrid)
- [x] All external services can be pointed to managed/cloud instances via env vars
- [x] Tests cover SMTP transport creation with TLS enabled/disabled
