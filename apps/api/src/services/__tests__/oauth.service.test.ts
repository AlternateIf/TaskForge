import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAuthorizationUrl } from '../oauth.service.js';

describe('oauth.service', () => {
  beforeEach(() => {
    vi.stubEnv('OAUTH_GOOGLE_CLIENT_ID', 'google-client-id');
    vi.stubEnv('OAUTH_GOOGLE_CLIENT_SECRET', 'google-client-secret');
    vi.stubEnv('OAUTH_GITHUB_CLIENT_ID', 'github-client-id');
    vi.stubEnv('OAUTH_GITHUB_CLIENT_SECRET', 'github-client-secret');
  });

  describe('buildAuthorizationUrl', () => {
    it('builds a Google authorization URL with correct params', () => {
      const url = buildAuthorizationUrl(
        'google',
        'test-state',
        'test-challenge',
        'http://localhost:3000/callback',
      );

      const parsed = new URL(url);
      expect(parsed.origin).toBe('https://accounts.google.com');
      expect(parsed.pathname).toBe('/o/oauth2/v2/auth');
      expect(parsed.searchParams.get('client_id')).toBe('google-client-id');
      expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:3000/callback');
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('state')).toBe('test-state');
      expect(parsed.searchParams.get('code_challenge')).toBe('test-challenge');
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
      expect(parsed.searchParams.get('scope')).toContain('openid');
      expect(parsed.searchParams.get('scope')).toContain('email');
      expect(parsed.searchParams.get('scope')).toContain('profile');
    });

    it('builds a GitHub authorization URL with correct params', () => {
      const url = buildAuthorizationUrl(
        'github',
        'test-state',
        'test-challenge',
        'http://localhost:3000/callback',
      );

      const parsed = new URL(url);
      expect(parsed.origin).toBe('https://github.com');
      expect(parsed.pathname).toBe('/login/oauth/authorize');
      expect(parsed.searchParams.get('client_id')).toBe('github-client-id');
      expect(parsed.searchParams.get('state')).toBe('test-state');
      expect(parsed.searchParams.get('scope')).toContain('read:user');
      expect(parsed.searchParams.get('scope')).toContain('user:email');
    });

    it('throws for unsupported provider', () => {
      expect(() =>
        buildAuthorizationUrl('twitter', 'state', 'challenge', 'http://localhost/cb'),
      ).toThrow('Unsupported OAuth provider: twitter');
    });

    it('throws when Google client ID is not configured', () => {
      vi.stubEnv('OAUTH_GOOGLE_CLIENT_ID', '');
      expect(() =>
        buildAuthorizationUrl('google', 'state', 'challenge', 'http://localhost/cb'),
      ).toThrow('Google OAuth not configured');
    });

    it('throws when GitHub client ID is not configured', () => {
      vi.stubEnv('OAUTH_GITHUB_CLIENT_ID', '');
      expect(() =>
        buildAuthorizationUrl('github', 'state', 'challenge', 'http://localhost/cb'),
      ).toThrow('GitHub OAuth not configured');
    });

    it('includes PKCE code challenge in all provider URLs', () => {
      for (const provider of ['google', 'github']) {
        const url = buildAuthorizationUrl(provider, 'state', 'my-challenge', 'http://localhost/cb');
        const parsed = new URL(url);
        expect(parsed.searchParams.get('code_challenge')).toBe('my-challenge');
        expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
      }
    });
  });
});
