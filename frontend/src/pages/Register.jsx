import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { registerUser } from "@/api/auth";
import AuthShell from "@/components/layout/AuthShell";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/errors";
import { registerSchema } from "@/validations/authSchemas";
import { useAuthStore } from "@/stores/authStore";

export default function Register() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(registerSchema) });

  const signUp = useMutation({
    mutationFn: registerUser,
    onSuccess: ({ user, token: newToken }) => {
      queryClient.clear();
      useAuthStore.getState().setAuth({ user, token: newToken });
      toast.success("Account created");
      navigate("/home", { replace: true });
    },
    onError: (error) => {
      const message = getErrorMessage(error, "Could not create the account");
      setServerError(message);
      toast.error(message);
    },
  });

  if (token) return <Navigate to="/home" replace />;

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={<>Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Sign in</Link></>}
    >
      <form
        onSubmit={handleSubmit((values) => {
          setServerError("");
          signUp.mutate(values);
        })}
        className="space-y-4"
        noValidate
      >
        <Input label="Name" autoComplete="name" placeholder="Your name" error={errors.name?.message} {...register("name")} />
        <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
        <Input label="Password" type="password" autoComplete="new-password" hint="6 to 72 characters" error={errors.password?.message} {...register("password")} />
        {serverError && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{serverError}</p>}
        <Button type="submit" loading={signUp.isPending} className="w-full">Create account</Button>
      </form>
    </AuthShell>
  );
}
