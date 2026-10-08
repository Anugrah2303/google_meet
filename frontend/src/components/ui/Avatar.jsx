import clsx from "clsx";
import { getInitials } from "@/lib/formatters";

const COLORS = ["bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-rose-600", "bg-amber-600", "bg-cyan-600", "bg-fuchsia-600"];

// Same name always gets the same colour
const colorFor = (name = "") => COLORS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % COLORS.length];

export default function Avatar({ name, src, className }) {
  if (src) {
    return <img src={src} alt={name || "avatar"} className={clsx("rounded-full object-cover", className || "h-9 w-9")} />;
  }
  return (
    <div
      aria-label={name}
      className={clsx("flex select-none items-center justify-center rounded-full font-semibold text-white", colorFor(name), className || "h-9 w-9 text-sm")}
    >
      {getInitials(name)}
    </div>
  );
}
