import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Home from "@/pages/Home";
import MeetingRoom from "@/pages/MeetingRoom";
import NotFound from "@/pages/NotFound";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/home", element: <Home /> },
      { path: "/meeting/:meetingId", element: <MeetingRoom /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

export default router;
