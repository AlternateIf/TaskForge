import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockIsFeatureEnabled } = vi.hoisted(() => ({
  mockIsFeatureEnabled: vi.fn(),
}));

vi.mock('../../services/feature-toggle.service.js', () => ({
  isFeatureEnabled: mockIsFeatureEnabled,
}));

import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireFeature } from '../require-feature.hook.js';

function mockRequest(orgId?: string): FastifyRequest {
  return {
    permissionContext: orgId ? { orgId } : undefined,
  } as unknown as FastifyRequest;
}

const mockReply = {} as FastifyReply;

describe('requireFeature hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should pass when feature is enabled', async () => {
    mockIsFeatureEnabled.mockResolvedValueOnce(true);

    const hook = requireFeature('comments');
    await expect(hook(mockRequest('org-1'), mockReply)).resolves.toBeUndefined();

    expect(mockIsFeatureEnabled).toHaveBeenCalledWith('org-1', 'comments');
  });

  it('should throw 403 when feature is disabled', async () => {
    mockIsFeatureEnabled.mockResolvedValueOnce(false);

    const hook = requireFeature('file_uploads');

    await expect(hook(mockRequest('org-1'), mockReply)).rejects.toThrow(
      'Feature "file_uploads" is disabled for this organization',
    );
  });

  it('should return early when permissionContext has no orgId', async () => {
    const hook = requireFeature('comments');
    await expect(hook(mockRequest(), mockReply)).resolves.toBeUndefined();

    expect(mockIsFeatureEnabled).not.toHaveBeenCalled();
  });

  it('should return early when permissionContext is not set', async () => {
    const request = { permissionContext: undefined } as unknown as FastifyRequest;

    const hook = requireFeature('search');
    await expect(hook(request, mockReply)).resolves.toBeUndefined();

    expect(mockIsFeatureEnabled).not.toHaveBeenCalled();
  });

  it('should check the correct feature key', async () => {
    mockIsFeatureEnabled.mockResolvedValueOnce(true);

    const hook = requireFeature('dependencies');
    await hook(mockRequest('org-2'), mockReply);

    expect(mockIsFeatureEnabled).toHaveBeenCalledWith('org-2', 'dependencies');
  });
});
