import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@readbutler/core/data";
import { supabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/env";

const PROTECTED = ["/library", "/read", "/stats"];
// Signed-out pages that signed-in users skip: their library replaces them.
const SIGNED_IN_REDIRECTS: Record<string, string> = { "/": "/library", "/try": "/library/new" };

/**
 * Refreshes the auth session cookie on each request and sends signed-out
 * visitors away from private pages, and signed-in visitors away from the
 * landing and try pages. Based on the @supabase/ssr Next.js guide.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseConfigured) return response;

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not put code between client creation and getClaims(): it validates the
  // JWT and triggers the refresh that keeps users signed in.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  const target = signedIn ? SIGNED_IN_REDIRECTS[path] : undefined;
  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Keep any refreshed session cookies set during getClaims().
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
