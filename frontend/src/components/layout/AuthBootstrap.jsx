import { useEffect, useState } from "react";
import { getMe } from "@/api/auth";
import Spinner from "@/components/ui/Spinner";
import { useAuthStore } from "@/stores/authStore";

// On app start: if we have a saved token, ask the server who we are (GET /auth/me).
// A 401 is handled by the axios interceptor (clears the session and redirects to /login).
export default function AuthBootstrap({ children }) {
  const [ready, setReady] = useState(() => !useAuthStore.getState().token);

  useEffect(() => {
    if (!useAuthStore.getState().token) return;
    let cancelled = false;
    getMe()
      .then((user) => !cancelled && useAuthStore.getState().setUser(user))
      .catch(() => {}) // offline etc.: keep the saved session
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  return children;
}
