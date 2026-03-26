import multipart from '@fastify/multipart';
import fp from 'fastify-plugin';

const MAX_FILE_SIZE = Number.parseInt(
  process.env.MAX_UPLOAD_SIZE_BYTES ?? String(50 * 1024 * 1024),
  10,
);

export default fp(
  async (fastify) => {
    await fastify.register(multipart, {
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
      },
    });
  },
  { name: 'multipart' },
);
