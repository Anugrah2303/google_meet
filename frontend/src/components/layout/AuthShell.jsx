import { Link } from "react-router-dom";
import { MdVideocam } from "react-icons/md";

// Shared frame for the login and register pages
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-semibold text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <MdVideocam size={22} />
          </span>
          Meetly
        </Link>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl sm:p-8">
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-400">{footer}</p>
      </div>
    </div>
  );
}
