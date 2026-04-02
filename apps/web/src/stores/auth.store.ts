import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserOrganization {
  id: string;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  organizationId?: string;
  organizationName?: string;
  organizations?: UserOrganization[];
  permissions?: string[];
  mustChangePassword?: boolean;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  activeOrganizationId: string | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setUser: (user: AuthUser) => void;
  setToken: (token: string) => void;
  setActiveOrganizationId: (organizationId: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      activeOrganizationId: null,

      setAuth: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: true,
          activeOrganizationId: user.organizationId ?? user.organizations?.[0]?.id ?? null,
        }),

      clearAuth: () =>
        set({ token: null, user: null, isAuthenticated: false, activeOrganizationId: null }),

      setUser: (user) =>
        set((state) => ({
          user,
          activeOrganizationId:
            state.activeOrganizationId ??
            user.organizationId ??
            user.organizations?.[0]?.id ??
            null,
        })),

      setToken: (token) => set({ token, isAuthenticated: true }),

      setActiveOrganizationId: (organizationId) => set({ activeOrganizationId: organizationId }),
    }),
    {
      name: 'tf:auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        activeOrganizationId: state.activeOrganizationId,
      }),
    },
  ),
);
