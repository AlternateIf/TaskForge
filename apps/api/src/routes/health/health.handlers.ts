import { pool } from '@taskforge/db';
import amqplib from 'amqplib';
import Redis from 'ioredis';
import { MeiliSearch } from 'meilisearch';
import { isServerShuttingDown } from '../../hooks/on-close.hook.js';

type DependencyStatus = 'ok' | 'error';

interface ReadinessResult {
  status: 'ok' | 'degraded';
  dependencies: Record<string, DependencyStatus>;
}

async function checkMariaDB(): Promise<DependencyStatus> {
  try {
    await pool.query('SELECT 1');
    return 'ok';
  } catch {
    return 'error';
  }
}

async function checkRedis(): Promise<DependencyStatus> {
  let client: Redis | undefined;
  try {
    client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      connectTimeout: 2000,
      lazyConnect: true,
    });
    await client.connect();
    await client.ping();
    return 'ok';
  } catch {
    return 'error';
  } finally {
    client?.disconnect();
  }
}

async function checkRabbitMQ(): Promise<DependencyStatus> {
  try {
    const conn = await amqplib.connect(
      process.env.RABBITMQ_URL ?? 'amqp://taskforge:taskforge@localhost:5672',
    );
    await conn.close();
    return 'ok';
  } catch {
    return 'error';
  }
}

async function checkMeilisearch(): Promise<DependencyStatus> {
  try {
    const client = new MeiliSearch({
      host: process.env.MEILISEARCH_URL ?? 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_MASTER_KEY ?? 'taskforge_dev_key',
    });
    await client.health();
    return 'ok';
  } catch {
    return 'error';
  }
}

export async function healthHandler(): Promise<{ status: string }> {
  return { status: 'ok' };
}

export async function readinessHandler(): Promise<{ statusCode: number; body: ReadinessResult }> {
  if (isServerShuttingDown()) {
    return {
      statusCode: 503,
      body: {
        status: 'degraded',
        dependencies: {
          mariadb: 'error',
          redis: 'error',
          rabbitmq: 'error',
          meilisearch: 'error',
        },
      },
    };
  }

  const [mariadb, redis, rabbitmq, meilisearch] = await Promise.all([
    checkMariaDB(),
    checkRedis(),
    checkRabbitMQ(),
    checkMeilisearch(),
  ]);

  const dependencies = { mariadb, redis, rabbitmq, meilisearch };
  const allOk = Object.values(dependencies).every((s) => s === 'ok');

  return {
    statusCode: allOk ? 200 : 503,
    body: { status: allOk ? 'ok' : 'degraded', dependencies },
  };
}
