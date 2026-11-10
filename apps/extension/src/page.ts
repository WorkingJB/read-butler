import { MAX_BODY_CHARS } from "@readbutler/core";
import { extractArticle, type PageSnapshot } from "@readbutler/core/article";
import type { ExtractedDocument } from "@readbutler/core/ingest";

// Pages bigger than this are almost always apps or data dumps, not articles.
const MAX_HTML_CHARS = 15_000_000;

/**
 * Captures the tab's rendered HTML (so content added by scripts is included)
 * and extracts the article from it. Needs activeTab, which Chrome grants for
 * the context menu, the keyboard shortcut and the toolbar button.
 */
export async function extractFromTab(tabId: number): Promise<ExtractedDocument> {
  let page: PageSnapshot | undefined;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (): PageSnapshot => ({ html: document.documentElement.outerHTML, url: location.href, title: document.title }),
    });
    page = result?.result as PageSnapshot | undefined;
  } catch {
    throw new Error(
      "Read Butler can't read this page. Chrome blocks extensions on its own pages and the Web Store; elsewhere, right-click the page and choose “Save page to Read Butler”.",
    );
  }
  if (!page?.html) throw new Error("This page has no readable content.");
  if (page.html.length > MAX_HTML_CHARS) throw new Error("This page is too large to extract.");

  const doc = extractArticle(page);
  if (!doc.text) throw new Error("No readable text found on this page.");
  if (doc.text.length > MAX_BODY_CHARS) throw new Error("This page's text is too long to save.");
  return doc;
}
