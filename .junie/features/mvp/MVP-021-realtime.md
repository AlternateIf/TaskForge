# MVP-021: Real-Time Updates

## Description
WebSocket and SSE server for pushing live updates to connected clients. Task changes, comments, and notifications are broadcast in real time. Includes fallback to polling.

## Personas
- **Sarah (PM)**: Sees task updates live during standups
- **Mira (Dashboard)**: Dashboards update without refresh
- **Kai (Performance)**: Reduces unnecessary API polling

## Dependencies
- MVP-005 (API server)
- MVP-018 (RabbitMQ — events trigger broadcasts)

## Scope

### Files to create
```
apps/api/src/
├── ws/
│   ├── gateway.ts              # @fastify/websocket setup, connection handling, auth
│   ├── channels.ts             # Channel subscription management
│   └── sse.ts                  # SSE fallback endpoint
├── queues/handlers/
│   └── realtime-broadcast.handler.ts  # Publish RabbitMQ events to connected WebSocket clients
```

### WebSocket server
- Endpoint: `wss://<host>/ws?token=<jwt>`
- Auth: JWT token validated on connection
- On connect: client sends subscribe messages for channels
- On disconnect: clean up subscriptions

### Channel types (MVP)
| Channel | Format | Events |
|---|---|---|
| Project | `project:<projectId>` | task.created, task.updated, task.deleted, comment.created |
| User | `user:me` | notification.created, task.assigned |

### Event format (to client)
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

### Broadcast flow
1. API service publishes entity change to RabbitMQ (e.g., `search.index` or a new `realtime.broadcast` event)
2. `realtime-broadcast.handler.ts` receives event
3. Determines which channels are affected (e.g., task update → `project:<projectId>`)
4. Sends event to all WebSocket clients subscribed to those channels

### Multi-instance broadcast (horizontal scaling)
- Use Redis pub/sub as a broadcast bus between API instances
- Worker publishes to Redis channel → all API instances receive → forward to their local WebSocket clients
- Channel: `realtime:<channel>` in Redis

### SSE fallback
- Endpoint: `GET /api/v1/events/stream` with Authorization header
- Sends same event format as WebSocket
- Client subscribes by query param: `?channels=project:proj_123,user:me`
- Auto-reconnect via standard SSE `retry` field

### Polling fallback
- If both WebSocket and SSE fail, client polls:
  - `GET /api/v1/notifications/unread-count` every 30s
  - Task list queries with `If-None-Match` (ETag) for minimal bandwidth

### Connection management
- Heartbeat ping every 30 seconds
- Close idle connections after 5 minutes of no subscriptions
- Max connections per user: 5 (prevent resource exhaustion)

## Acceptance Criteria
- [ ] WebSocket server accepts connections with valid JWT
- [ ] Invalid/expired JWT rejects connection
- [ ] Clients can subscribe to and unsubscribe from channels
- [ ] Task changes are broadcast to project channel subscribers
- [ ] Notifications are broadcast to user channel
- [ ] SSE endpoint works as fallback with same event format
- [ ] Redis pub/sub enables multi-instance broadcast
- [ ] Heartbeat keeps connections alive
- [ ] Max connections per user enforced
- [ ] Graceful shutdown closes connections with reconnect-friendly code
- [ ] Tests cover connection, subscription, broadcast, auth rejection
