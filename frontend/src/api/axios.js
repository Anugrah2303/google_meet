import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // send the HTTP-only cookie too
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthForm = url.includes("/auth/login") || url.includes("/auth/register");

    // 401 anywhere else means the session is gone: clear it and go to the login page
    if (error.response?.status === 401 && !isAuthForm) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== "/login") window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);
