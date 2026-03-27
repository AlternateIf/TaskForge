import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export function generateETag(data: unknown): string {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `W/"${hash}"`;
}

export function handleETag(request: FastifyRequest, reply: FastifyReply, data: unknown): boolean {
  const etag = generateETag(data);
  reply.header('ETag', etag);

  const ifNoneMatch = request.headers['if-none-match'];
  if (ifNoneMatch === etag) {
    reply.status(304).send();
    return true;
  }
  return false;
}
