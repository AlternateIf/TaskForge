import crypto from 'node:crypto';
import fp from 'fastify-plugin';

/**
 * Cache-Control policies by route pattern.
 * More specific patterns are matched first via iteration order.
 */
const CACHE_POLICIES: { pattern: RegExp; cacheControl: string }[] = [
  // User profile — private, cache for 5 minutes
  { pattern: /^\/api\/v1\/users\/me$/, cacheControl: 'private, max-age=300' },

  // Feature toggles and org auth settings — short cache
  {
    pattern: /^\/api\/v1\/organizations\/[^/]+\/(features|auth-settings)$/,
    cacheControl: 'private, max-age=60',
  },

  // List endpoints — always revalidate (ETag-driven)
  { pattern: /^\/api\/v1\/(tasks|projects|notifications|comments)/, cacheControl: 'no-cache' },

  // Single resource GETs — always revalidate
  { pattern: /^\/api\/v1\/projects\/[^/]+$/, cacheControl: 'no-cache' },
];

function getCacheControl(url: string): string {
  // Strip query string for matching
  const path = url.split('?')[0];
  for (const { pattern, cacheControl } of CACHE_POLICIES) {
    if (pattern.test(path)) {
      return cacheControl;
    }
  }
  // Default: no caching
  return 'no-store';
}

export default fp(
  async (fastify) => {
    fastify.addHook('onSend', async (request, reply, payload) => {
      // Only apply to successful GET responses with a body
      if (request.method !== 'GET') return payload;
      if (reply.statusCode < 200 || reply.statusCode >= 300) return payload;
      if (!payload) return payload;

      // Set Cache-Control
      const cacheControl = getCacheControl(request.url);
      reply.header('Cache-Control', cacheControl);

      // Generate and set ETag from response body
      const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const hash = crypto.createHash('md5').update(body).digest('hex');
      const etag = `W/"${hash}"`;
      reply.header('ETag', etag);

      // Check If-None-Match for conditional request
      const ifNoneMatch = request.headers['if-none-match'];
      if (ifNoneMatch === etag) {
        reply.status(304);
        return '';
      }

      return payload;
    });
  },
  { name: 'cache-hook' },
);

// Export for testing
export { getCacheControl };
