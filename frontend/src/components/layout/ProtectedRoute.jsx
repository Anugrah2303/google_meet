import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  // "from" lets the login page send the user back where they wanted to go
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
