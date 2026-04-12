import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rbacRoutes } from '../rbac.routes.js';

const { mockAuthorize } = vi.hoisted(() => ({
  mockAuthorize: vi.fn(),
}));

vi.mock('../../../hooks/authorize.hook.js', () => ({
  authorize: mockAuthorize,
}));

describe('rbac.routes org-scoped role permission gates', () => {
  let fastify: {
    authenticate: ReturnType<typeof vi.fn>;
    addHook: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = {
      authenticate: vi.fn(),
      addHook: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };
  });

  it('registers only org-scoped role routes (no global-* routes)', async () => {
    await rbacRoutes(fastify as never);

    const allPaths = [
      ...(fastify.get as ReturnType<typeof vi.fn>).mock.calls.map(
        (call: unknown[]) => call[0] as string,
      ),
      ...(fastify.post as ReturnType<typeof vi.fn>).mock.calls.map(
        (call: unknown[]) => call[0] as string,
      ),
      ...(fastify.patch as ReturnType<typeof vi.fn>).mock.calls.map(
        (call: unknown[]) => call[0] as string,
      ),
      ...(fastify.delete as ReturnType<typeof vi.fn>).mock.calls.map(
        (call: unknown[]) => call[0] as string,
      ),
    ];

    // No global-* routes should exist
    const globalRoutes = allPaths.filter((path: string) => path.startsWith('/api/v1/global-'));
    expect(globalRoutes).toHaveLength(0);

    // Org-scoped routes should exist
    expect(allPaths.some((p: string) => p === '/api/v1/organizations/:orgId/roles')).toBe(true);
    expect(
      allPaths.some((p: string) => p === '/api/v1/organizations/:orgId/role-assignments'),
    ).toBe(true);
    expect(
      allPaths.some((p: string) => p === '/api/v1/organizations/:orgId/permission-assignments'),
    ).toBe(true);
  });

  it('uses authorize hook with resource=role and action=read for list org roles', async () => {
    const mockPreHandler = vi.fn();
    mockAuthorize.mockReturnValue(mockPreHandler);

    await rbacRoutes(fastify as never);

    expect(mockAuthorize).toHaveBeenCalledWith({ resource: 'role', action: 'read' });
  });

  it('uses authorize hook with resource=role and action=delete for delete org role', async () => {
    const mockPreHandler = vi.fn();
    mockAuthorize.mockReturnValue(mockPreHandler);

    await rbacRoutes(fastify as never);

    expect(mockAuthorize).toHaveBeenCalledWith({ resource: 'role', action: 'delete' });
  });
});
