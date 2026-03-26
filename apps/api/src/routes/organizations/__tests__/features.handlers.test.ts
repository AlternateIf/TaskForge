import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetFeatures, mockUpdateFeatures } = vi.hoisted(() => ({
  mockGetFeatures: vi.fn(),
  mockUpdateFeatures: vi.fn(),
}));

vi.mock('../../../services/feature-toggle.service.js', () => ({
  getFeatures: mockGetFeatures,
  updateFeatures: mockUpdateFeatures,
}));

import type { FastifyReply, FastifyRequest } from 'fastify';
import { getFeaturesHandler, updateFeaturesHandler } from '../features.handlers.js';

function mockRequest(params: Record<string, string> = {}, body?: unknown) {
  return {
    params,
    body,
    authUser: { userId: 'user-1' },
  } as unknown as FastifyRequest;
}

function mockReply() {
  const reply = {
    status: vi.fn(),
    send: vi.fn(),
  };
  reply.status.mockReturnValue(reply);
  reply.send.mockReturnValue(reply);
  return reply as unknown as FastifyReply & {
    status: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };
}

describe('features.handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getFeaturesHandler', () => {
    it('should return features for the organization', async () => {
      const features = {
        notifications: true,
        file_uploads: true,
        search: false,
        comments: true,
        subtasks: true,
        dependencies: true,
        mfa: true,
      };
      mockGetFeatures.mockResolvedValueOnce(features);

      const req = mockRequest({ id: 'org-1' });
      const reply = mockReply();

      await getFeaturesHandler(req as FastifyRequest<{ Params: { id: string } }>, reply);

      expect(mockGetFeatures).toHaveBeenCalledWith('org-1');
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        data: features,
      });
    });

    it('should throw 401 when not authenticated', async () => {
      const req = {
        params: { id: 'org-1' },
        authUser: undefined,
      } as unknown as FastifyRequest<{ Params: { id: string } }>;
      const reply = mockReply();

      await expect(getFeaturesHandler(req, reply)).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateFeaturesHandler', () => {
    it('should update features and return the result', async () => {
      const updatedFeatures = {
        notifications: true,
        file_uploads: false,
        search: true,
        comments: true,
        subtasks: true,
        dependencies: true,
        mfa: true,
      };
      mockUpdateFeatures.mockResolvedValueOnce(updatedFeatures);

      const req = mockRequest({ id: 'org-1' }, { file_uploads: false });
      const reply = mockReply();

      await updateFeaturesHandler(
        req as unknown as FastifyRequest<{
          Params: { id: string };
          Body: Record<string, boolean>;
        }>,
        reply,
      );

      expect(mockUpdateFeatures).toHaveBeenCalledWith('org-1', { file_uploads: false });
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({
        data: updatedFeatures,
      });
    });

    it('should throw 401 when not authenticated', async () => {
      const req = {
        params: { id: 'org-1' },
        body: { comments: false },
        authUser: undefined,
      } as unknown as FastifyRequest<{
        Params: { id: string };
        Body: Record<string, boolean>;
      }>;
      const reply = mockReply();

      await expect(updateFeaturesHandler(req, reply)).rejects.toThrow('Not authenticated');
    });
  });
});
