import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../supabase";

/** Email one-time code sign-in; no redirect URL needed inside an extension. */
export function Account({ session }: { session: Session | null }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!supabaseConfigured) return <p className="hint">Sync is not configured for this build.</p>;

  if (session) {
    return (
      <div className="account">
        <p>
          Signed in as <strong>{session.user.email}</strong>. Your library and progress sync with the web app.
        </p>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = sent
      ? await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" })
      : await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setError(error.message);
    else if (!sent) setSent(true);
  }

  return (
    <form className="account" onSubmit={submit}>
      <p>Sign in to save documents and sync your place across devices. Reading works without an account.</p>
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        disabled={sent}
        onChange={(e) => setEmail(e.target.value)}
      />
      {sent && (
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      )}
      <button className="primary" disabled={busy}>
        {busy ? "…" : sent ? "Sign in" : "Email me a code"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
