import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/queryClient";
import router from "@/router";
import AuthBootstrap from "@/components/layout/AuthBootstrap";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
