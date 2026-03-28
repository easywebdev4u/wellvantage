import { create } from 'zustand';
import { get, storeToken, getToken, clearToken } from '../services/api';
import { logError } from '../utils';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  loadToken: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setAuth: async (token, user) => {
    try {
      await storeToken(token);
      set({ token, user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      logError('Failed to store auth token', error);
      set({ isLoading: false });
      throw error;
    }
  },

  loadToken: async () => {
    try {
      const token = await getToken();
      if (token) {
        const user = await get<User>('/auth/me');
        set({ token, user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      try {
        await clearToken();
      } catch {
        // Keychain unavailable — safe to ignore
      }
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  logout: async () => {
    try {
      await clearToken();
    } catch {
      // Keychain unavailable — safe to ignore
    }
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
