import Fastify from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import authPlugin from '../auth.plugin.js';

describe('auth.plugin', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(authPlugin);
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  describe('jwtSign / jwtVerify', () => {
    it('signs and verifies a token round-trip', () => {
      const token = fastify.jwtSign({ sub: 'user-1', email: 'a@b.com' }, 300);
      const payload = fastify.jwtVerify(token);
      expect(payload.sub).toBe('user-1');
      expect(payload.email).toBe('a@b.com');
      expect(payload.iat).toBeTypeOf('number');
      expect(payload.exp).toBe(payload.iat + 300);
    });

    it('produces a three-part dot-separated JWT', () => {
      const token = fastify.jwtSign({ sub: 'x' }, 60);
      expect(token.split('.')).toHaveLength(3);
    });

    it('rejects a tampered payload', () => {
      const token = fastify.jwtSign({ sub: 'user-1' }, 300);
      const [header, _body, signature] = token.split('.');
      const tamperedBody = Buffer.from(
        JSON.stringify({ sub: 'hacker', iat: 0, exp: 9999999999 }),
      ).toString('base64url');
      const tampered = `${header}.${tamperedBody}.${signature}`;
      expect(() => fastify.jwtVerify(tampered)).toThrow('Invalid signature');
    });

    it('rejects a tampered signature', () => {
      const token = fastify.jwtSign({ sub: 'user-1' }, 300);
      const tampered = `${token.slice(0, -4)}XXXX`;
      expect(() => fastify.jwtVerify(tampered)).toThrow('Invalid signature');
    });

    it('rejects an expired token', () => {
      const token = fastify.jwtSign({ sub: 'user-1' }, -1);
      expect(() => fastify.jwtVerify(token)).toThrow('Token expired');
    });

    it('rejects a malformed token (no dots)', () => {
      expect(() => fastify.jwtVerify('not-a-jwt')).toThrow('Invalid token format');
    });

    it('rejects a token with too many parts', () => {
      expect(() => fastify.jwtVerify('a.b.c.d')).toThrow('Invalid token format');
    });
  });
});

describe('auth.plugin authenticate', () => {
  async function buildApp() {
    const app = Fastify();
    await app.register(authPlugin);
    app.get(
      '/test',
      { preHandler: app.authenticate },
      (request: FastifyRequest, reply: FastifyReply) => {
        reply.send({ user: request.authUser });
      },
    );
    await app.ready();
    return app;
  }

  it('sets authUser on request with valid Bearer token', async () => {
    const app = await buildApp();
    const token = app.jwtSign({ sub: 'user-1', email: 'test@x.com' }, 300);

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.user.userId).toBe('user-1');
    expect(body.user.email).toBe('test@x.com');
    await app.close();
  });

  it('returns 401 without authorization header', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/test' });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('returns 401 with non-Bearer scheme', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: 'Basic abc123' },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('returns 401 with expired token', async () => {
    const app = await buildApp();
    const token = app.jwtSign({ sub: 'user-1' }, -1);

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });
});
