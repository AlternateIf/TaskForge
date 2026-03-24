import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { AppError, ErrorCode } from '../utils/errors.js';

export interface AuthUser {
  userId: string;
  email: string;
  sessionId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production';

interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export default fp(
  async (fastify: FastifyInstance) => {
    // Simple JWT sign/verify using Node crypto (no @fastify/jwt dependency)
    const { createHmac } = await import('node:crypto');

    function base64UrlEncode(data: string): string {
      return Buffer.from(data).toString('base64url');
    }

    function base64UrlDecode(data: string): string {
      return Buffer.from(data, 'base64url').toString('utf-8');
    }

    function sign(payload: Record<string, unknown>, expiresIn: number): string {
      const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const now = Math.floor(Date.now() / 1000);
      const body = base64UrlEncode(JSON.stringify({ ...payload, iat: now, exp: now + expiresIn }));
      const signature = createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');
      return `${header}.${body}.${signature}`;
    }

    function verify(token: string): JwtPayload {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid token format');

      const [header, body, signature] = parts;
      const expectedSig = createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');

      if (signature !== expectedSig) throw new Error('Invalid signature');

      const payload = JSON.parse(base64UrlDecode(body)) as JwtPayload;
      if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');

      return payload;
    }

    // Decorate fastify with jwt utilities
    fastify.decorate('jwtSign', sign);
    fastify.decorate('jwtVerify', verify);

    // Authentication hook — use as preHandler on protected routes
    fastify.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Missing or invalid authorization header');
      }

      const token = authHeader.slice(7);
      try {
        const payload = verify(token);
        request.authUser = { userId: payload.sub, email: payload.email };
      } catch {
        throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid or expired token');
      }
    });
  },
  { name: 'auth' },
);

declare module 'fastify' {
  interface FastifyInstance {
    jwtSign: (payload: Record<string, unknown>, expiresIn: number) => string;
    jwtVerify: (token: string) => JwtPayload;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
