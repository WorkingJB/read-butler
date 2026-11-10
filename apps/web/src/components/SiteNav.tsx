import Link from "next/link";
import { supabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { MobileMenu } from "./MobileMenu";

const linkClass = "text-muted hover:text-foreground";

/**
 * Top navigation. Signed out: "Try it" and "Sign in", which fit inline at any
 * width. Signed in: Library, Progress and Sign out, folded into a menu on phones.
 */
export async function SiteNav() {
  let signedIn = false;
  if (supabaseConfigured) {
    const { data } = await (await createClient()).auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  }

  if (!signedIn) {
    return (
      <>
        <Link href="/try" className={linkClass}>
          Try it
        </Link>
        {supabaseConfigured && (
          <Link href="/login" className="btn ml-auto">
            Sign in
          </Link>
        )}
      </>
    );
  }

  return (
    <>
      <div className="hidden flex-1 items-center gap-6 sm:flex">
        <Link href="/library" className={linkClass}>
          Library
        </Link>
        <Link href="/stats" className={linkClass}>
          Progress
        </Link>
        <form action={signOut} className="ml-auto">
          <button className={linkClass}>Sign out</button>
        </form>
      </div>
      <MobileMenu>
        <Link href="/library" className="block px-4 py-3 hover:bg-foreground/5">
          Library
        </Link>
        <Link href="/stats" className="block px-4 py-3 hover:bg-foreground/5">
          Progress
        </Link>
        <form action={signOut} className="border-t border-line">
          <button className="block w-full px-4 py-3 text-left text-muted hover:bg-foreground/5">Sign out</button>
        </form>
      </MobileMenu>
    </>
  );
}
