import { useAuthStore } from "../stores/authStore";

export function useAuth() {
  const { user, isAuthenticated, isHydrating, setAuth, logout, hydrate } = useAuthStore();
  return { user, isAuthenticated, isHydrating, setAuth, logout, hydrate };
}
