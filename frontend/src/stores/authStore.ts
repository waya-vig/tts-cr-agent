import { create } from "zustand";
import type { User } from "../types";
import api from "../services/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isHydrating: true,

  setAuth: (user, token) => {
    localStorage.setItem("access_token", token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ isHydrating: false });
      return;
    }
    // Token exists — set it immediately so API interceptor can use it
    set({ token, isAuthenticated: true });
    try {
      const res = await api.get<User>("/auth/me");
      set({ user: res.data, isHydrating: false });
    } catch {
      // Token expired or invalid — clear auth state
      localStorage.removeItem("access_token");
      set({ user: null, token: null, isAuthenticated: false, isHydrating: false });
    }
  },
}));
