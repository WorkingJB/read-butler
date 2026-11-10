import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Vercel caps function responses at 4.5 MB. Image-free Gutenberg EPUBs are far
// smaller (War and Peace is 1.8 MB).
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Downloads a Project Gutenberg EPUB (no CORS on gutenberg.org) for the
 * browser to parse. The host is fixed and the id numeric, so this can't be
 * pointed anywhere else. Uses the image-free edition to stay small.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/books/[id]">) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "Sign in to add books." }, { status: 401 });

  const { id } = await ctx.params;
  if (!/^\d{1,7}$/.test(id)) return NextResponse.json({ error: "Unknown book." }, { status: 400 });

  const res = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.epub`, {
    headers: { "user-agent": "ReadButler/1.0 (+https://www.readbutler.com)" },
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok || !res.body) return NextResponse.json({ error: "Couldn't download that book from Project Gutenberg." }, { status: 502 });

  const size = Number(res.headers.get("content-length") ?? 0);
  if (size > MAX_BYTES) return NextResponse.json({ error: "That book is too large to import." }, { status: 413 });

  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) return NextResponse.json({ error: "That book is too large to import." }, { status: 413 });
  return new NextResponse(bytes, {
    headers: { "content-type": "application/epub+zip", "cache-control": "private, max-age=86400" },
  });
}
