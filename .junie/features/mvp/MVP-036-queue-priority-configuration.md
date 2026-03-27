# MVP-036: Queue Priority Configuration

## Description
Configure per-queue consumer prefetch counts to prioritize processing of time-sensitive messages (real-time broadcasts) over background tasks (search indexing). Document the priority strategy.

## Personas
- **Marcus (Backend)**: Needs real-time events processed sub-second
- **Kai (Performance)**: Search indexing shouldn't block notification delivery
- **Sam (DevOps)**: Needs visibility into queue processing rates

## Dependencies
- MVP-018 (RabbitMQ & Worker)

## Scope

### Prefetch configuration per queue
| Queue | Prefetch | Rationale |
|---|---|---|
| `realtime.broadcast` | 10 | High throughput for real-time events |
| `notification.create` | 5 | Important but not time-critical |
| `email.send` | 3 | Can tolerate seconds of delay |
| `search.index` | 1 | Background task, Meilisearch batches internally |

### Implementation
- Add `prefetch` to `QueueBinding` interface in `config.ts`
- Update `consumer.ts` to use per-queue prefetch via `channel.prefetch(n, false)` or create separate channels per queue
- Since amqplib prefetch is per-channel, consider one channel per queue for true per-queue prefetch

### Configuration via env (optional)
- `QUEUE_PREFETCH_REALTIME=10`
- `QUEUE_PREFETCH_NOTIFICATION=5`
- `QUEUE_PREFETCH_EMAIL=3`
- `QUEUE_PREFETCH_SEARCH=1`

## Acceptance Criteria
- [x] Each queue has a configurable prefetch count
- [x] High-priority queues process messages faster than low-priority ones
- [x] Default prefetch values are sensible without env configuration
- [x] Tests verify per-queue prefetch setup
