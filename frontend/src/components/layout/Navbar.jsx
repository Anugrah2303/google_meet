import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { MdVideocam, MdLogout } from "react-icons/md";
import { toast } from "sonner";
import { logoutUser } from "@/api/auth";
import Avatar from "@/components/ui/Avatar";
import ProfileModal from "@/components/home/ProfileModal";
import { useAuthStore } from "@/stores/authStore";

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser(); // clears the HTTP-only cookie
    } catch {
      // even if the request fails we still forget the session locally
    }
    useAuthStore.getState().logout();
    queryClient.clear();
    toast.success("Logged out");
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/home" className="flex items-center gap-2 text-lg font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <MdVideocam size={20} />
          </span>
          Meetly
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-slate-800"
            aria-label="Edit profile"
          >
            <Avatar name={user?.name} src={user?.avatar} />
            <span className="hidden text-sm text-slate-200 sm:block">{user?.name}</span>
          </button>
          <button onClick={handleLogout} className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Log out" title="Log out">
            <MdLogout size={20} />
          </button>
        </div>
      </div>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </header>
  );
}
