import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.DEV ? "/api/v1" : `${import.meta.env.VITE_API_URL || "https://zpmwn9i8vv.ap-northeast-1.awsapprunner.com"}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only force-redirect if this is NOT the /auth/me hydration call
      // (hydrate() handles its own cleanup on 401)
      const url = error.config?.url || "";
      if (!url.endsWith("/auth/me")) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
