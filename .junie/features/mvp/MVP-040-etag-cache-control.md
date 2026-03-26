# MVP-040: ETag & Cache-Control Headers

## Description
Add ETag support on list endpoints and Cache-Control headers on infrequently changing data to reduce bandwidth and improve client-side performance, especially for polling fallback scenarios.

## Personas
- **Kai (Performance)**: Reduce unnecessary data transfer for polling clients
- **Priya (Frontend)**: TanStack Query can leverage ETags for smarter cache invalidation
- **Omar (Integration)**: API consumers benefit from conditional requests

## Dependencies
- MVP-005 (API server)

## Scope

### ETag endpoints
| Endpoint | ETag strategy |
|---|---|
| GET `/api/v1/tasks` | Hash of task IDs + updatedAt timestamps |
| GET `/api/v1/notifications` | Hash of notification IDs + readAt |
| GET `/api/v1/notifications/unread-count` | Hash of count value |
| GET `/api/v1/projects/:id` | Hash of project updatedAt |

### Implementation
- Generate ETag from response content hash (weak ETag: `W/"hash"`)
- Check `If-None-Match` request header
- Return `304 Not Modified` with empty body when ETag matches
- Add `Cache-Control` headers:
  - List endpoints: `no-cache` (always validate with server)
  - Static config (project settings, feature toggles): `max-age=60`
  - User profile: `private, max-age=300`

### Fastify integration
- Use a Fastify `onSend` hook or per-route response handler
- Compute ETag before sending, compare with request header

## Acceptance Criteria
- [ ] List endpoints return ETag headers
- [ ] Conditional GET returns 304 when content unchanged
- [ ] Cache-Control headers are set appropriately per endpoint type
- [ ] Polling clients see reduced bandwidth usage
- [ ] Tests cover ETag generation, 304 responses, and Cache-Control values
