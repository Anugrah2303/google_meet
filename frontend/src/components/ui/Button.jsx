import clsx from "clsx";
import Spinner from "./Spinner";

const variants = {
  primary: "bg-blue-600 text-white hover:bg-blue-500",
  secondary: "border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700",
  danger: "bg-red-600 text-white hover:bg-red-500",
  ghost: "text-slate-200 hover:bg-slate-800",
};
const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
