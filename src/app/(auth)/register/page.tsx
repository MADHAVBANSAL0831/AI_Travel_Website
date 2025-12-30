import { Suspense } from "react";
import AuthPage from "@/components/auth/AuthPage";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center">Loading...</div>}>
      <AuthPage initialMode="register" />
    </Suspense>
  );
}
