import fp from 'fastify-plugin';

export default fp(
  async (fastify) => {
    fastify.addHook('onRequest', async (request) => {
      request.startTime = process.hrtime.bigint();
    });

    fastify.addHook('onResponse', async (request, reply) => {
      const duration = Number(process.hrtime.bigint() - request.startTime) / 1_000_000;

      // Sanitize URL to prevent token leakage in logs
      let logUrl = request.url;
      if (logUrl.includes('token=')) {
        try {
          const parsed = new URL(logUrl, 'http://localhost');
          parsed.searchParams.delete('token');
          logUrl = parsed.pathname + (parsed.search || '');
        } catch {
          // If URL parsing fails, redact the token portion
          logUrl = logUrl.replace(/token=[^&]+/g, 'token=[REDACTED]');
        }
      }

      request.log.info(
        {
          method: request.method,
          url: logUrl,
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
