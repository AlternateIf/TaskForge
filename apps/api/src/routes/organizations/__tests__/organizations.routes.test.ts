import { describe, expect, it, vi } from 'vitest';
import { organizationRoutes } from '../organizations.routes.js';

describe('organizations.routes legacy regression', () => {
  it('does not register the removed legacy member-add-by-email endpoint', async () => {
    const registered = {
      get: [] as string[],
      post: [] as string[],
      patch: [] as string[],
      delete: [] as string[],
    };

    const fastify = {
      authenticate: vi.fn(),
      addHook: vi.fn(),
      get: vi.fn((path: string) => {
        registered.get.push(path);
      }),
      post: vi.fn((path: string) => {
        registered.post.push(path);
      }),
      patch: vi.fn((path: string) => {
        registered.patch.push(path);
      }),
      delete: vi.fn((path: string) => {
        registered.delete.push(path);
      }),
    };

    await organizationRoutes(fastify as never);

    expect(registered.post).toContain('/api/v1/organizations');
    expect(registered.post).not.toContain('/api/v1/organizations/:id/members');
  });
});

describe('organizations.routes permission-matrix endpoint', () => {
  it('registers the GET permission-matrix route', async () => {
    const registered = {
      get: [] as string[],
      post: [] as string[],
      patch: [] as string[],
      delete: [] as string[],
    };

    const fastify = {
      authenticate: vi.fn(),
      addHook: vi.fn(),
      get: vi.fn((path: string) => {
        registered.get.push(path);
      }),
      post: vi.fn((path: string) => {
        registered.post.push(path);
      }),
      patch: vi.fn((path: string) => {
        registered.patch.push(path);
      }),
      delete: vi.fn((path: string) => {
        registered.delete.push(path);
      }),
    };

    await organizationRoutes(fastify as never);

    expect(registered.get).toContain('/api/v1/organizations/:id/permission-matrix');
  });
});
