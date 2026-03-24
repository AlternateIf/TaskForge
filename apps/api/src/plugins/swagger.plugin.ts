import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';

export default fp(
  async (fastify) => {
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'TaskForge API',
          description: 'TaskForge project management API',
          version: '1.0.0',
        },
        servers: [{ url: `http://localhost:${process.env.PORT ?? 3000}` }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
      transform: ({ schema, url, ...rest }) => {
        // Transform Zod schemas to JSON Schema for Swagger
        return { schema, url, ...rest };
      },
    });

    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
    });
  },
  { name: 'swagger' },
);
