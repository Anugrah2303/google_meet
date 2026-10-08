import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { loginUser } from "@/api/auth";
import AuthShell from "@/components/layout/AuthShell";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/errors";
import { loginSchema } from "@/validations/authSchemas";
import { useAuthStore } from "@/stores/authStore";

export default function Login() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");
  const from = location.state?.from?.pathname || "/home";

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema) });

  const login = useMutation({
    mutationFn: loginUser,
    onSuccess: ({ user, token: newToken }) => {
      queryClient.clear(); // never show the previous user's cached data
      useAuthStore.getState().setAuth({ user, token: newToken });
      toast.success(`Welcome back, ${user.name}`);
      navigate(from, { replace: true });
    },
    onError: (error) => {
      const message = getErrorMessage(error, "Could not log in");
      setServerError(message);
      toast.error(message);
    },
  });

  if (token) return <Navigate to="/home" replace />;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use your email and password to continue."
      footer={<>New to Meetly? <Link to="/register" className="text-blue-400 hover:underline">Create an account</Link></>}
    >
      <form
        onSubmit={handleSubmit((values) => {
          setServerError("");
          login.mutate(values);
        })}
        className="space-y-4"
        noValidate
      >
        <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
        <Input label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        {serverError && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{serverError}</p>}
        <Button type="submit" loading={login.isPending} className="w-full">Sign in</Button>
      </form>
    </AuthShell>
  );
}
