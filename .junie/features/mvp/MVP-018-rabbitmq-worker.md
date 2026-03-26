# MVP-018: RabbitMQ & Worker Process

## Description
Set up RabbitMQ connection via rascal, publisher utility for the API, and the worker process that consumes messages. This is the async backbone for notifications, emails, search indexing, and future features.

## Personas
- **Marcus (Backend)**: Decoupled async processing
- **Sam (DevOps)**: Separate worker container for scaling

## Dependencies
- MVP-002 (RabbitMQ container)
- MVP-005 (API server)

## Scope

### Files to create
```
apps/api/src/
├── queues/
│   ├── config.ts              # Rascal broker config (exchanges, queues, bindings)
│   ├── publisher.ts           # Publish messages from API services
│   ├── consumer.ts            # Consume messages in worker process
│   └── handlers/
│       ├── email.handler.ts          # Process email sending jobs
│       ├── notification.handler.ts   # Process in-app notification creation
│       └── search-index.handler.ts   # Process Meilisearch index updates
├── worker.ts                  # Worker entry point: connect to RabbitMQ, register consumers
```

### Rascal configuration
```
Exchanges:
  taskforge.events (topic exchange)

Queues + bindings:
  email.send          <- taskforge.events / email.#
  notification.create <- taskforge.events / notification.#
  search.index        <- taskforge.events / search.#
```

### Publisher API
```typescript
// Used in API services
import { publish } from '../queues/publisher';

await publish('notification.task_assigned', {
  userId: assignee.id,
  taskId: task.id,
  actorId: currentUser.id,
});

await publish('email.task_assigned', {
  to: assignee.email,
  taskId: task.id,
  actorName: currentUser.displayName,
});

await publish('search.index', {
  entity: 'task',
  id: task.id,
  action: 'upsert',
});
```

### Worker process
```typescript
// worker.ts
const broker = await createBroker(rascalConfig);
registerConsumer(broker, 'email.send', emailHandler);
registerConsumer(broker, 'notification.create', notificationHandler);
registerConsumer(broker, 'search.index', searchIndexHandler);
```

### Error handling
- Failed messages are retried 3 times with exponential backoff
- After 3 failures, dead-lettered to `*.dead-letter` queue
- Dead-letter queues are monitored via RabbitMQ management UI

### Message format
```json
{
  "type": "notification.task_assigned",
  "timestamp": "2026-03-24T14:30:00.000Z",
  "data": {
    "userId": "abc",
    "taskId": "123"
  },
  "correlationId": "req_abc123"
}
```

## Acceptance Criteria
- [x] Rascal connects to RabbitMQ on API and worker startup
- [x] Publisher can send messages from any API service
- [x] Worker starts and consumes messages from all queues
- [x] Messages include type, timestamp, data, and correlationId
- [x] Failed messages retry 3 times then dead-letter
- [x] Dead-letter queues exist for each consumer queue
- [x] Worker gracefully shuts down (finishes in-progress messages)
- [x] Publisher confirmations ensure messages are persisted
- [x] Tests cover publishing and consuming (using test broker)
