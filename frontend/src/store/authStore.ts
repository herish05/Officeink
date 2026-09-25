import { create } from 'zustand';
import { User } from '../types';
import { fetchApi } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('officelink_token'),
  isAuthenticated: !!localStorage.getItem('officelink_token'),
  isLoading: true,

  login: (token: string, user: User) => {
    localStorage.setItem('officelink_token', token);
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (_) {}
    localStorage.removeItem('officelink_token');
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('officelink_token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const user = await fetchApi<User>('/auth/me');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      localStorage.removeItem('officelink_token');
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (updatedFields: Partial<User>) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updatedFields } });
    }
  }
}));
