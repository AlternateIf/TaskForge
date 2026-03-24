# MVP-028: Frontend — Real-Time Integration

## Description
WebSocket client with SSE fallback that integrates with TanStack Query to automatically update the UI when server-side changes occur. Covers task updates, comment additions, notification delivery, and presence indicators.

## Personas
- **Sarah (PM)**: Sees board update in real-time when team moves tasks
- **Marcus (Backend)**: Expects reliable connection handling and reconnection
- **Priya (Frontend)**: Clean integration with existing data fetching layer

## Dependencies
- MVP-021 (WebSocket/SSE server)
- MVP-022 (app shell, TanStack Query setup)
- MVP-023 (Kanban board — real-time card movement)
- MVP-024 (task detail — real-time comment updates)
- MVP-025 (notifications — real-time notification delivery)

## Scope

### Files to create
```
apps/web/src/
├── lib/
│   └── realtime/
│       ├── client.ts              # WebSocket client with SSE fallback
│       ├── connection-manager.ts  # Connection lifecycle, reconnection logic
│       ├── channel-manager.ts     # Subscribe/unsubscribe to channels
│       └── types.ts               # Event type definitions
├── hooks/
│   ├── use-realtime.ts            # Core hook: connect, subscribe, handle events
│   ├── use-realtime-sync.ts       # TanStack Query cache invalidation on events
│   └── use-presence.ts            # Track who's online / viewing what
├── components/
│   └── layout/
│       └── connection-status.tsx   # Connection indicator (connected/reconnecting/offline)
```

### WebSocket client (`client.ts`)
- Connects to `ws://<host>/ws` (or `wss://` in production)
- Sends auth token on connection: `{ type: "auth", token: "<jwt>" }`
- Handles incoming events as JSON messages
- Automatic SSE fallback if WebSocket fails after 2 attempts
- SSE connects to `GET /api/v1/sse/events` with `Authorization` header

### Connection manager (`connection-manager.ts`)
- States: `connecting`, `connected`, `reconnecting`, `disconnected`
- Reconnection strategy:
  - Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
  - Max reconnection attempts: 20 (then stop, show offline indicator)
  - Reset backoff on successful connection
- Heartbeat: respond to server ping every 30s
- On page visibility change: reconnect if connection was lost while tab was hidden
- On network online event: trigger immediate reconnect

### Channel manager (`channel-manager.ts`)
- Subscribe to channels on connect/reconnect:
  ```jsonl
  { "type": "subscribe", "channel": "project:<projectId>" }
  { "type": "subscribe", "channel": "user:<userId>" }
  ```
- Auto-subscribe to `user:<currentUserId>` on connect
- Subscribe/unsubscribe to project channels as user navigates
- Track active subscriptions and re-subscribe on reconnect

### Event types and handlers
```typescript
type RealtimeEvent =
  | { type: 'task.created'; payload: { task: Task; projectId: string } }
  | { type: 'task.updated'; payload: { taskId: string; changes: Partial<Task>; projectId: string } }
  | { type: 'task.deleted'; payload: { taskId: string; projectId: string } }
  | { type: 'task.moved'; payload: { taskId: string; fromStatus: string; toStatus: string; position: number; projectId: string } }
  | { type: 'comment.created'; payload: { comment: Comment; taskId: string } }
  | { type: 'notification.new'; payload: { notification: Notification } }
  | { type: 'presence.update'; payload: { userId: string; status: 'online' | 'away' | 'offline'; viewingTaskId?: string } }
```

### TanStack Query integration (`use-realtime-sync.ts`)
Maps incoming events to query cache updates:

| Event | Cache Action |
|---|---|
| `task.created` | Invalidate `['tasks', projectId]` queries |
| `task.updated` | Update task in cache via `queryClient.setQueryData` |
| `task.deleted` | Remove task from cache |
| `task.moved` | Update task status + position in cache (animate on Kanban) |
| `comment.created` | Invalidate `['comments', taskId]` queries |
| `notification.new` | Add to notification cache, increment unread count |
| `presence.update` | Update presence store |

Key behaviors:
- **Optimistic update deduplication**: If the event matches a pending optimistic update from the current user, skip the cache update (already applied)
- **Selective invalidation**: Only invalidate queries that are currently active (have observers)
- **Batched updates**: Buffer events received within 100ms and apply as a single batch to avoid render storms

### Presence (`use-presence.ts`)
- Tracks which users are online
- Tracks which task a user is currently viewing (sent when task detail is open)
- Shows online indicator on user avatars
- Shows "X is viewing this task" on task detail panel
- Presence state stored in a lightweight Zustand store (not TanStack Query)

### Connection status indicator (`connection-status.tsx`)
- Small indicator in header or footer
- States:
  - Connected: green dot (hidden after 3s)
  - Reconnecting: yellow dot with "Reconnecting..." text
  - Disconnected: red dot with "Offline — changes may not sync" text
- Click to manually trigger reconnect

### SSE fallback behavior
- Activates if WebSocket connection fails twice consecutively
- SSE is receive-only: subscribes via query params `?channels=project:abc,user:123`
- No presence support over SSE (gracefully degraded — avatars show no online status)
- Channel changes require closing and reopening SSE connection with new params

### Integration points
- **App shell** (`app-shell.tsx`): Initialize realtime connection on mount, show connection status
- **Project views** (`board.tsx`, `list.tsx`): Subscribe to `project:<id>` on mount, unsubscribe on unmount
- **Task detail** (`task-detail-panel.tsx`): Send presence "viewing task" event, listen for comment events
- **Notification bell** (`notification-bell.tsx`): Listen for `notification.new` events, update badge count

## Acceptance Criteria
- [ ] WebSocket connects on app load with JWT auth
- [ ] SSE fallback activates if WebSocket fails
- [ ] Reconnection with exponential backoff works
- [ ] Subscribes to user channel automatically
- [ ] Subscribes/unsubscribes to project channels on navigation
- [ ] Task changes from other users appear on Kanban board in real-time
- [ ] Task changes from other users appear in list view in real-time
- [ ] New comments appear in task detail without refresh
- [ ] Notifications arrive in real-time and update unread badge
- [ ] Optimistic updates from current user are not duplicated
- [ ] Presence indicators show online users
- [ ] "Viewing this task" indicator works on task detail
- [ ] Connection status indicator shows current state
- [ ] Tab visibility change triggers reconnection if needed
- [ ] Network online event triggers reconnection
- [ ] Events are batched to prevent render storms
- [ ] Unit tests cover connection manager logic, channel subscription handling, and TanStack Query cache sync
