import { Suspense } from "react";
import { supabaseConfigured } from "@/lib/env";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  if (!supabaseConfigured) {
    return <p className="text-muted">Supabase is not configured. Copy apps/web/.env.example to .env.local.</p>;
  }
  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mt-2 text-sm text-muted">We&apos;ll email you a 6-digit code. No password needed.</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
