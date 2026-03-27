export const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://taskforge:taskforge@localhost:5672';

export const EXCHANGE = 'taskforge.events';
export const DEAD_LETTER_EXCHANGE = 'taskforge.dead-letter';

export const MAX_RETRIES = 3;
export const RETRY_BACKOFF_MS = [1_000, 5_000, 15_000] as const;

export interface QueueBinding {
  queue: string;
  routingPattern: string;
  deadLetterQueue: string;
  /** Per-queue consumer prefetch count. Higher = higher throughput priority. */
  prefetch: number;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed;
}

export const QUEUES: QueueBinding[] = [
  {
    queue: 'realtime.broadcast',
    routingPattern: 'realtime.#',
    deadLetterQueue: 'realtime.broadcast.dead-letter',
    prefetch: envInt('QUEUE_PREFETCH_REALTIME', 10),
  },
  {
    queue: 'notification.create',
    routingPattern: 'notification.#',
    deadLetterQueue: 'notification.create.dead-letter',
    prefetch: envInt('QUEUE_PREFETCH_NOTIFICATION', 5),
  },
  {
    queue: 'email.send',
    routingPattern: 'email.#',
    deadLetterQueue: 'email.send.dead-letter',
    prefetch: envInt('QUEUE_PREFETCH_EMAIL', 3),
  },
  {
    queue: 'search.index',
    routingPattern: 'search.#',
    deadLetterQueue: 'search.index.dead-letter',
    prefetch: envInt('QUEUE_PREFETCH_SEARCH', 1),
  },
];

export interface TaskForgeMessage<T = unknown> {
  type: string;
  timestamp: string;
  data: T;
  correlationId: string;
}
