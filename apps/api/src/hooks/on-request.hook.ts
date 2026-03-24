import fp from 'fastify-plugin';

export default fp(
  async (fastify) => {
    fastify.addHook('onRequest', async (request) => {
      request.startTime = process.hrtime.bigint();
    });

    fastify.addHook('onResponse', async (request, reply) => {
      const duration = Number(process.hrtime.bigint() - request.startTime) / 1_000_000;
      request.log.info(
        {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          durationMs: Math.round(duration * 100) / 100,
        },
        'request completed',
      );
    });
  },
  { name: 'on-request-hook' },
);

declare module 'fastify' {
  interface FastifyRequest {
    startTime: bigint;
  }
}
