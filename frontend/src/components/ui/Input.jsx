import { forwardRef, useId } from "react";
import clsx from "clsx";

// forwardRef lets react-hook-form's register() reach the real <input>
const Input = forwardRef(function Input({ label, error, hint, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        className={clsx(
          "w-full rounded-xl border bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2",
          error ? "border-red-500 focus:ring-red-500/40" : "border-slate-700 focus:border-blue-500 focus:ring-blue-500/40"
        )}
        {...props}
      />
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
});

export default Input;
