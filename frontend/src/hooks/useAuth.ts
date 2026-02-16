import { useAuthStore } from "../stores/authStore";

export function useAuth() {
  const { user, isAuthenticated, setAuth, logout, hydrate } = useAuthStore();
  return { user, isAuthenticated, setAuth, logout, hydrate };
}
