# TaskForge — API Conventions

This document defines the standards for all REST API endpoints. Every endpoint must follow these conventions for consistency (see Design Principle #5).

---

## Base URL

```
/api/v1
```

All endpoints are prefixed with the API version. When breaking changes are introduced, a new version is created (`/api/v2`) with a documented deprecation window for the previous version.

Sandbox environment uses a separate base URL: `/api/sandbox/v1`. Sandbox requests return a `X-TaskForge-Sandbox: true` header.

---

## URL Patterns

### Resource naming
- Use **plural nouns**: `/projects`, `/tasks`, `/comments`
- Use **kebab-case** for multi-word resources: `/custom-fields`, `/time-entries`
- Use **nesting** for parent-child relationships (max 2 levels):
  ```
  /projects/:projectId/tasks
  /tasks/:taskId/comments
  ```
- Avoid nesting beyond 2 levels — use top-level with query filters instead:
  ```
  GET /comments?taskId=123       (not /projects/1/tasks/2/comments)
  ```

### Standard CRUD operations
| Action | Method | URL | Response |
|---|---|---|---|
| List | GET | `/resources` | 200 + paginated array |
| Get one | GET | `/resources/:id` | 200 + object |
| Create | POST | `/resources` | 201 + created object |
| Update | PATCH | `/resources/:id` | 200 + updated object |
| Delete | DELETE | `/resources/:id` | 204 no content |

### Custom actions
Use a verb suffix for non-CRUD operations:
```
POST /tasks/:id/assign
POST /tasks/:id/archive
POST /approval-requests/:id/approve
POST /approval-requests/:id/reject
POST /releases/:id/sign-off
```

---

## Health Check Endpoints

These endpoints are **not** versioned and live outside `/api/v1`.

### Liveness — `GET /health`
Returns 200 if the API process is running. No dependency checks. Used by container orchestrators for restart decisions.

```json
{ "status": "ok" }
```

### Readiness — `GET /ready`
Returns 200 only if all critical dependencies are reachable. Used by load balancers to determine if the instance can serve traffic.

```json
{
  "status": "ok",
  "dependencies": {
    "mariadb": "ok",
    "redis": "ok",
    "rabbitmq": "ok",
    "meilisearch": "ok"
  }
}
```

If any dependency is unreachable, returns 503:
```json
{
  "status": "degraded",
  "dependencies": {
    "mariadb": "ok",
    "redis": "error",
    "rabbitmq": "ok",
    "meilisearch": "ok"
  }
}
```

---

## Request Format

- Content-Type: `application/json` (default)
- Content-Type: `multipart/form-data` (file uploads only — see File Uploads section)
- Use **camelCase** for all JSON field names
- Omit fields to leave them unchanged on PATCH (partial update)
- Send `null` explicitly to clear a nullable field

### Query parameters
- Use **camelCase**: `?assigneeId=123&dueDate=2026-03-24`
- Arrays: repeat the key: `?status=open&status=in_progress`
- Date ranges: `?dueDateFrom=2026-01-01&dueDateTo=2026-03-31`

---

## Response Format

### Success envelope

```jsonc
{
  "data": { ... },
  "meta": { ... }
}
```

- **Single resource**: `data` is an object
- **Collection**: `data` is an array, `meta` includes pagination info
- **Delete**: 204 with no body

### Pagination (cursor-based)

```jsonc
{
  "data": [ ... ],
  "meta": {
    "cursor": "eyJpZCI6MTIzfQ==",
    "hasMore": true,
    "totalCount": 456
  }
}
```

- Request: `?cursor=abc&limit=25`
- Default limit: 25, maximum: 100
- `totalCount` is included only when `?includeCount=true` (expensive on large datasets)

### Timestamps
- All timestamps are **ISO 8601 in UTC**: `"2026-03-24T14:30:00.000Z"`
- Field naming: `createdAt`, `updatedAt`, `deletedAt`

---

## Caching

### ETag support
- All GET responses for single resources include an `ETag` header (based on content hash)
- Clients send `If-None-Match` with the ETag value; server returns `304 Not Modified` if unchanged
- Reduces bandwidth and speeds up repeated reads

### Cache-Control
- Immutable static assets (fonts, compiled JS/CSS via CDN): `Cache-Control: public, max-age=31536000, immutable`
- API list endpoints: `Cache-Control: private, no-cache` (always revalidate via ETag)
- API single-resource endpoints: `Cache-Control: private, max-age=0, must-revalidate` + ETag
- Public shared dashboard/report pages: `Cache-Control: public, max-age=60` (1 minute TTL)

---

## Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description of the error.",
    "details": [
      {
        "field": "dueDate",
        "message": "Must be a future date."
      }
    ]
  }
}
```

### Standard error codes

| HTTP Status | Code | When |
|---|---|---|
| 400 | VALIDATION_ERROR | Request body/params fail validation |
| 400 | BAD_REQUEST | Malformed request |
| 401 | UNAUTHORIZED | Missing or invalid auth token |
| 403 | FORBIDDEN | Valid auth but insufficient permissions |
| 404 | NOT_FOUND | Resource does not exist or not accessible |
| 409 | CONFLICT | Duplicate or conflicting state (e.g., duplicate email) |
| 413 | FILE_TOO_LARGE | Upload exceeds max file size |
| 415 | UNSUPPORTED_MEDIA_TYPE | File type not in allowed MIME type list |
| 422 | UNPROCESSABLE_ENTITY | Semantically invalid (e.g., assigning to a non-member) |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Unexpected server error (no internals exposed) |

- Never expose stack traces, SQL, or internal details in error responses
- Log full error context server-side with a correlation ID
- Include `X-Request-Id` header on all responses for traceability

---

## Authentication

### JWT Bearer token
```
Authorization: Bearer <token>
```

- Access tokens: short-lived (15 minutes)
- Refresh tokens: long-lived (7 days), stored in HTTP-only cookie
- Token refresh: `POST /auth/refresh`
- All sessions invalidated on password change

### Personal Access Tokens
```
Authorization: Bearer pat_<token>
```

- Prefixed with `pat_` to distinguish from JWT tokens
- Scoped permissions (read, write, admin — per resource type)
- Optional expiration date
- Created and revoked via `POST /auth/tokens` and `DELETE /auth/tokens/:id`
- `last_used_at` updated on each use for security auditing

### OAuth 2.0 / OIDC
- Authorization code flow for third-party apps
- PKCE required for public clients
- Scopes: `read`, `write`, `admin` (granular scopes per resource in v2)
- IP allowlisting configurable per OAuth app

---

## Rate Limiting

- Default: 100 requests/minute per authenticated user
- Unauthenticated: 20 requests/minute per IP
- Bulk operations: 10 requests/minute
- File uploads: 30 requests/minute
- Headers on every response:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 87
  X-RateLimit-Reset: 1711296000
  ```
- 429 response includes `Retry-After` header

---

## Filtering, Sorting, and Field Selection

### Filtering
```
GET /tasks?status=open&priority=high&assigneeId=123
GET /tasks?dueDateFrom=2026-01-01&dueDateTo=2026-03-31
GET /tasks?search=login+bug
GET /tasks?releaseId=rel_456
GET /tasks?customField.region=EMEA
```

### Sorting
```
GET /tasks?sort=dueDate&order=asc
GET /tasks?sort=priority&order=desc
```
- Default sort: `createdAt` descending
- Multi-field sort: `?sort=priority,dueDate&order=desc,asc`

### Field selection (sparse fieldsets)
```
GET /tasks?fields=id,title,status,assigneeId
```
- Reduces payload size for list views and mobile clients

---

## Aggregation Endpoints

For reporting and dashboard queries, use the `/aggregate` sub-resource:

```
GET /tasks/aggregate?groupBy=status&metric=count
GET /tasks/aggregate?groupBy=assigneeId&metric=sum&field=estimatedHours
GET /tasks/aggregate?groupBy=status,priority&metric=count&projectId=proj_123
```

### Response format
```json
{
  "data": [
    { "group": { "status": "open" }, "value": 42 },
    { "group": { "status": "in_progress" }, "value": 18 },
    { "group": { "status": "done" }, "value": 97 }
  ],
  "meta": {
    "metric": "count",
    "groupBy": ["status"],
    "totalGroups": 3
  }
}
```

- Supported metrics: `count`, `sum`, `avg`, `min`, `max`
- Supports all standard filters as additional query parameters
- Multiple groupBy fields for nested grouping: `?groupBy=status,priority`
- Available on: `/tasks/aggregate`, `/issues/aggregate`, `/time-entries/aggregate`

---

## Bulk Operations

```
POST /tasks/bulk
{
  "action": "updateStatus",
  "ids": ["id1", "id2", "id3"],
  "data": { "statusId": "abc" }
}
```

- Maximum 100 items per bulk request
- Returns individual results per item (success/failure per ID)
- Partial success is possible — never all-or-nothing

---

## File Uploads

### Upload endpoint pattern
```
POST /attachments
Content-Type: multipart/form-data
```

### Validation rules
- **MIME type whitelist**: images (jpeg, png, gif, webp, svg), documents (pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv), archives (zip). Configurable per organization.
- **Extension check**: file extension must match declared MIME type
- **Max file size**: 50 MB default, configurable per organization (max 200 MB)
- **Malware scanning**: if enabled, files are quarantined (`scan_status: pending`) until scan completes. Clean files become accessible; infected files return 403.

### Response
```json
{
  "data": {
    "id": "att_123",
    "filename": "design-v2.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 2048576,
    "scanStatus": "clean",
    "url": "/api/v1/attachments/att_123/download",
    "createdAt": "2026-03-24T14:30:00.000Z"
  }
}
```

---

## Real-Time API (WebSocket / SSE)

### Connection
```
WebSocket: wss://api.taskforge.dev/ws?token=<jwt>
SSE:       GET /api/v1/events/stream (Authorization header)
```

### Subscription model
Clients subscribe to channels after connecting:

```jsonc
// Subscribe
{ "type": "subscribe", "channel": "project:proj_123" }
{ "type": "subscribe", "channel": "task:task_456" }
{ "type": "subscribe", "channel": "user:me" }

// Unsubscribe
{ "type": "unsubscribe", "channel": "project:proj_123" }
```

### Event format
```json
{
  "type": "task.updated",
  "channel": "project:proj_123",
  "timestamp": "2026-03-24T14:30:00.000Z",
  "data": {
    "taskId": "task_456",
    "changes": { "status": { "from": "open", "to": "in_progress" } },
    "actor": { "id": "user_789", "displayName": "Sarah" }
  }
}
```

### Presence
```jsonc
// Presence event
{
  "type": "presence",
  "channel": "task:task_456",
  "data": {
    "users": [
      { "id": "user_789", "displayName": "Sarah", "status": "viewing" }
    ]
  }
}
```

### Channels
| Channel | Events |
|---|---|
| `project:<id>` | Task/issue CRUD, comments, status changes within project |
| `task:<id>` | Updates, comments, assignment changes on specific task |
| `user:me` | Notifications, assignment changes for current user |
| `dashboard:<id>` | Widget data refresh triggers |

### Fallback
If WebSocket connection fails, clients fall back to SSE. If SSE is also unavailable, client polls via standard REST endpoints on a 30-second interval.

---

## Alert Ingestion Endpoint

```
POST /api/v1/alerts/ingest/:configId
```

Accepts payloads from external monitoring tools and creates issues.

### Prometheus AlertManager format
```json
{
  "alerts": [
    {
      "status": "firing",
      "labels": { "alertname": "HighLatency", "severity": "critical", "service": "api" },
      "annotations": { "summary": "API latency > 500ms for 5 minutes" },
      "startsAt": "2026-03-24T14:30:00.000Z"
    }
  ]
}
```

### Generic format
```json
{
  "title": "High API Latency",
  "description": "API latency > 500ms for 5 minutes",
  "severity": "critical",
  "source": "grafana",
  "deduplicationKey": "high-latency-api-2026-03-24"
}
```

- Authentication: via configId (pre-shared) + optional token header
- Deduplication: if an open issue with the same dedup key exists, the alert is appended as a comment rather than creating a new issue
- Returns 201 (new issue created) or 200 (existing issue updated)

---

## Webhook Event Format

```json
{
  "id": "evt_abc123",
  "type": "task.status_changed",
  "timestamp": "2026-03-24T14:30:00.000Z",
  "data": {
    "taskId": "task_123",
    "projectId": "proj_456",
    "changes": {
      "status": { "from": "in_progress", "to": "done" }
    },
    "actor": { "id": "user_789", "displayName": "Sarah" }
  }
}
```

- Signature header: `X-TaskForge-Signature: sha256=<hmac>`
- Retry policy: 3 attempts with exponential backoff (1s, 10s, 60s)
- Delivery timeout: 10 seconds

---

## Versioning Policy

- Current version in URL path: `/api/v1`
- Breaking changes require a new version
- Previous version supported for minimum 6 months after new version release
- Deprecation communicated via `Sunset` header and changelog
- Non-breaking additions (new fields, new endpoints) are added to the current version

---

## Graceful Shutdown

When the API server receives a termination signal (SIGTERM):

1. Stop accepting new connections
2. Finish processing in-flight requests (30-second grace period)
3. Close WebSocket connections with a reconnect-friendly close code (4000)
4. Drain RabbitMQ publisher confirmations
5. Close database and Redis connections
6. Exit with code 0

The `/ready` endpoint returns 503 immediately on SIGTERM to prevent load balancers from routing new requests.
