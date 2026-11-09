import { NextResponse, type NextRequest } from "next/server";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { assembleChapters, htmlToText, type ExtractedDocument } from "@readbutler/core/ingest";
import { createClient } from "@/lib/supabase/server";
import { FetchRejected, safeFetch } from "@/lib/safe-fetch";

/**
 * Imports a web page: fetches it server-side (browsers can't fetch most sites
 * cross-origin) and keeps only the article text. Signed-in users only, so
 * the endpoint can't be used as an open proxy.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "Sign in to import web pages." }, { status: 401 });

  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  if (typeof url !== "string" || url.length > 2000) {
    return NextResponse.json({ error: "Send a URL." }, { status: 400 });
  }

  try {
    const page = await safeFetch(url);
    const doc = page.contentType.includes("text/plain") ? fromText(page.body, page.url) : fromHtml(page.body, page.url);
    if (!doc.text) return NextResponse.json({ error: "No readable text found on that page." }, { status: 422 });
    return NextResponse.json(doc);
  } catch (e) {
    const message = e instanceof FetchRejected ? e.message : "Could not fetch that page.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

function fromHtml(html: string, url: string): ExtractedDocument {
  const { document } = parseHTML(html);
  const article = new Readability(document as unknown as Document).parse();
  const source = article?.content
    ? parseHTML(`<!doctype html><html><body>${article.content}</body></html>`).document.body
    : document.body;
  const { text, sections } = assembleChapters([{ text: htmlToText(source as unknown as Node) }]);
  const title = article?.title?.trim() || document.title?.trim() || new URL(url).hostname;
  return { title: title.slice(0, 300), text, sections, sourceType: "url", sourceName: url };
}

function fromText(body: string, url: string): ExtractedDocument {
  const { text, sections } = assembleChapters([{ text: body }]);
  return { title: new URL(url).pathname.split("/").pop() || url, text, sections, sourceType: "url", sourceName: url };
}
