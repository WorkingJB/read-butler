import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GutenbergBook } from "@/lib/books";

interface GutendexBook {
  id: number;
  title: string;
  authors: { name: string }[];
  download_count: number;
}

/**
 * Searches Project Gutenberg's catalog through Gutendex (which sends no CORS
 * headers, hence the proxy). Public-domain EPUBs only; an empty query returns
 * the most downloaded books. Results are cached for a day.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "Sign in to search books." }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 200);
  const params = new URLSearchParams({ mime_type: "application/epub", copyright: "false" });
  if (q) params.set("search", q);

  try {
    const res = await fetch(`https://gutendex.com/books/?${params}`, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`Gutendex ${res.status}`);
    const body = (await res.json()) as { results: GutendexBook[] };
    const books: GutenbergBook[] = body.results.slice(0, 24).map((b) => ({
      id: b.id,
      title: b.title.replace(/\s+/g, " ").trim(),
      authors: b.authors.map((a) => flipName(a.name)),
      downloads: b.download_count,
    }));
    return NextResponse.json({ books });
  } catch {
    return NextResponse.json({ error: "The book catalog isn't responding. Try again in a minute." }, { status: 502 });
  }
}

/** "Austen, Jane" -> "Jane Austen". */
function flipName(name: string): string {
  const [last, first, ...rest] = name.split(", ");
  return first && rest.length === 0 ? `${first} ${last}` : name;
}
