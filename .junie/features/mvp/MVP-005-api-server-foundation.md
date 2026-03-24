# MVP-005: API Server Foundation

## Description
Set up the Fastify server with core plugins, error handling, request ID tracing, response envelope helpers, pagination utilities, ETag support, rate limiting, Swagger docs, and graceful shutdown.

## Personas
- **Marcus (Backend)**: Needs clean server structure with consistent patterns
- **Omar (Integration Dev)**: Expects consistent error format, rate limit headers, and Swagger docs
- **Sam (DevOps)**: Needs health checks and graceful shutdown
- **Kai (Performance)**: Needs ETag caching from the start

## Dependencies
- MVP-001 (apps/api exists)
- MVP-004 (database connection available)

## Scope

### Files to create/modify
```
apps/api/
├── src/
│   ├── server.ts              # Fastify instance creation, plugin registration, start
│   ├── plugins/
│   │   ├── cors.plugin.ts     # @fastify/cors config
│   │   ├── helmet.plugin.ts   # @fastify/helmet (security headers)
│   │   ├── rate-limit.plugin.ts # @fastify/rate-limit (100/min auth, 20/min unauth)
│   │   ├── swagger.plugin.ts  # @fastify/swagger + @fastify/swagger-ui
│   │   └── request-id.plugin.ts # X-Request-Id header on all responses
│   ├── routes/
│   │   └── health/
│   │       ├── health.routes.ts   # GET /health, GET /ready
│   │       └── health.handlers.ts # Liveness + readiness logic (check MariaDB, Redis, RabbitMQ, Meilisearch)
│   ├── hooks/
│   │   ├── on-request.hook.ts     # Logging, request timing
│   │   ├── on-error.hook.ts       # Structured error handling, correlation ID
│   │   └── on-close.hook.ts       # Graceful shutdown sequence
│   └── utils/
│       ├── logger.ts              # Pino logger config (structured JSON)
│       ├── errors.ts              # AppError class, error code constants, error response builder
│       ├── response.ts            # Success envelope: { data, meta } helpers
│       ├── pagination.ts          # Cursor encode/decode, paginate query helper
│       └── etag.ts                # ETag generation and If-None-Match comparison
├── package.json                   # Add fastify, @fastify/cors, helmet, rate-limit, swagger, etc.
├── tsconfig.json
└── vitest.config.ts
```

### Error handling
All errors go through the Fastify error handler and return the standard format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": [...]
  }
}
```
- Zod validation errors are transformed into `details` array
- Unknown errors return 500 INTERNAL_ERROR with no internals exposed
- All errors include `X-Request-Id` in response

### Response helpers
```typescript
// Success response
reply.status(200).send(success(data));
// { data: {...} }

// Paginated response
reply.status(200).send(paginated(items, cursor, hasMore, totalCount));
// { data: [...], meta: { cursor, hasMore, totalCount } }
```

### Rate limiting
- Authenticated: 100 req/min (keyed by user ID)
- Unauthenticated: 20 req/min (keyed by IP)
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- 429 includes Retry-After header

### Graceful shutdown
On SIGTERM:
1. `/ready` returns 503
2. Stop accepting new connections
3. Wait up to 30s for in-flight requests
4. Close database pool
5. Close Redis connection
6. Exit 0

### Health checks
- `GET /health` → 200 `{ "status": "ok" }` (process alive)
- `GET /ready` → 200/503 with dependency status (MariaDB, Redis, RabbitMQ, Meilisearch)

### Swagger
- Available at `/docs`
- Auto-generated from Zod schemas via fastify-type-provider-zod
- Includes auth (Bearer token) security scheme

## Acceptance Criteria
- [ ] Server starts and listens on configured port
- [ ] `GET /health` returns 200
- [ ] `GET /ready` returns 200 with all dependencies "ok" (503 if any fail)
- [ ] Unknown routes return 404 in standard error format
- [ ] Validation errors return 400 with field-level details
- [ ] Rate limit headers present on all responses
- [ ] 429 returned when rate limit exceeded
- [ ] X-Request-Id present on all responses
- [ ] Swagger UI accessible at `/docs`
- [ ] Graceful shutdown completes within 30 seconds
- [ ] ETag helper correctly generates and compares ETags
- [ ] Pagination helper encodes/decodes cursors correctly
- [ ] All errors are logged with structured JSON (no stack traces in response)
