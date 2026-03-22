import { create } from 'zustand';
import type { AuthState, User } from '../types';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const loadFromStorage = (): { token: string | null; user: User | null } => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    const user = raw ? (JSON.parse(raw) as User) : null;
    // Check expiry stored alongside
    const expiry = localStorage.getItem('token_expiry');
    if (expiry && new Date(expiry) < new Date()) {
      localStorage.clear();
      return { token: null, user: null };
    }
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
};

const { token, user } = loadFromStorage();

export const useAuthStore = create<AuthState>((set) => ({
  token,
  user,
  isAuthenticated: !!token && !!user,

  login: (token, user, expiresAt) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem('token_expiry', expiresAt);
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('token_expiry');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
