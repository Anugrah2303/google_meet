import { Link } from "react-router-dom";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-semibold text-blue-500">404</p>
      <h1 className="text-xl font-medium text-white">This page does not exist</h1>
      <p className="max-w-sm text-sm text-slate-400">The link may be broken, or the page was moved.</p>
      <Link to="/home">
        <Button>Go to home</Button>
      </Link>
    </div>
  );
}
