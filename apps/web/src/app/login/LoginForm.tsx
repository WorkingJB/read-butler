"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Email one-time code sign-in. The same flow works in the Chrome extension,
 * which can't easily receive magic-link redirects, so both clients share it.
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="mt-6 space-y-3">
        <input
          className="input"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Sending…" : "Email me a code"}
        </button>
        {error && <p className="text-sm text-accent">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="mt-6 space-y-3">
      <p className="text-sm">
        Code sent to <strong>{email}</strong>.
      </p>
      <input
        className="input tracking-[0.5em]"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6,10}"
        required
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Checking…" : "Sign in"}
      </button>
      <button type="button" className="w-full text-sm text-muted" onClick={() => setStep("email")}>
        Use a different email
      </button>
      {error && <p className="text-sm text-accent">{error}</p>}
    </form>
  );
}

/** Only allow same-site relative paths, to avoid open redirects. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/library";
}
