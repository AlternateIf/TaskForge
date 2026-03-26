export const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://taskforge:taskforge@localhost:5672';

export const EXCHANGE = 'taskforge.events';
export const DEAD_LETTER_EXCHANGE = 'taskforge.dead-letter';

export const MAX_RETRIES = 3;
export const RETRY_BACKOFF_MS = [1_000, 5_000, 15_000] as const;

export interface QueueBinding {
  queue: string;
  routingPattern: string;
  deadLetterQueue: string;
}

export const QUEUES: QueueBinding[] = [
  {
    queue: 'email.send',
    routingPattern: 'email.#',
    deadLetterQueue: 'email.send.dead-letter',
  },
  {
    queue: 'notification.create',
    routingPattern: 'notification.#',
    deadLetterQueue: 'notification.create.dead-letter',
  },
  {
    queue: 'search.index',
    routingPattern: 'search.#',
    deadLetterQueue: 'search.index.dead-letter',
  },
];

export interface TaskForgeMessage<T = unknown> {
  type: string;
  timestamp: string;
  data: T;
  correlationId: string;
}
