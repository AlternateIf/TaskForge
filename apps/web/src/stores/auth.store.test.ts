import { beforeEach, describe, expect, it } from 'vitest';
import { type AuthUser, useAuthStore } from './auth.store';

const MOCK_USER: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  organizationId: 'org-1',
  organizationName: 'Acme Corp',
};

beforeEach(() => {
  // Reset store to initial state between tests
  useAuthStore.setState({
    token: null,
    user: null,
    isAuthenticated: false,
    activeOrganizationId: null,
  });
  localStorage.clear();
});

describe('useAuthStore', () => {
  describe('initial state', () => {
    it('starts unauthenticated', () => {
      const { token, user, isAuthenticated, activeOrganizationId } = useAuthStore.getState();
      expect(token).toBeNull();
      expect(user).toBeNull();
      expect(isAuthenticated).toBe(false);
      expect(activeOrganizationId).toBeNull();
    });
  });

  describe('setAuth', () => {
    it('sets token, user, and isAuthenticated', () => {
      useAuthStore.getState().setAuth('tok-abc', MOCK_USER);
      const { token, user, isAuthenticated, activeOrganizationId } = useAuthStore.getState();
      expect(token).toBe('tok-abc');
      expect(user).toEqual(MOCK_USER);
      expect(isAuthenticated).toBe(true);
      expect(activeOrganizationId).toBe('org-1');
    });
  });

  describe('clearAuth', () => {
    it('resets all auth state', () => {
      useAuthStore.getState().setAuth('tok-abc', MOCK_USER);
      useAuthStore.getState().clearAuth();
      const { token, user, isAuthenticated, activeOrganizationId } = useAuthStore.getState();
      expect(token).toBeNull();
      expect(user).toBeNull();
      expect(isAuthenticated).toBe(false);
      expect(activeOrganizationId).toBeNull();
    });
  });

  describe('setUser', () => {
    it('updates the user without touching token or isAuthenticated', () => {
      useAuthStore.getState().setAuth('tok-abc', MOCK_USER);
      const updated: AuthUser = { ...MOCK_USER, displayName: 'Updated Name' };
      useAuthStore.getState().setUser(updated);
      const { token, user, isAuthenticated } = useAuthStore.getState();
      expect(token).toBe('tok-abc');
      expect(user?.displayName).toBe('Updated Name');
      expect(isAuthenticated).toBe(true);
    });
  });

  describe('setToken', () => {
    it('updates only the token', () => {
      useAuthStore.getState().setAuth('tok-old', MOCK_USER);
      useAuthStore.getState().setToken('tok-new');
      const { token, user, isAuthenticated } = useAuthStore.getState();
      expect(token).toBe('tok-new');
      expect(user).toEqual(MOCK_USER);
      expect(isAuthenticated).toBe(true);
    });
  });
});
