import Link from "next/link";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export async function NavAuth() {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    return (
      <Link href="/login" className="btn">
        Sign in
      </Link>
    );
  }
  return (
    <>
      <Link href="/library" className="text-muted hover:text-foreground">
        Library
      </Link>
      <Link href="/stats" className="text-muted hover:text-foreground">
        Progress
      </Link>
      <form action={signOut}>
        <button className="text-muted hover:text-foreground">Sign out</button>
      </form>
    </>
  );
}
