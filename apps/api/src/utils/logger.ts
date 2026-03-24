import type { FastifyBaseLogger } from 'fastify';

export const loggerConfig = {
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
        }
      : undefined,
  serializers: {
    req(request: { method: string; url: string; id: string }) {
      return { method: request.method, url: request.url, requestId: request.id };
    },
    res(reply: { statusCode: number }) {
      return { statusCode: reply.statusCode };
    },
  },
};

export type Logger = FastifyBaseLogger;
