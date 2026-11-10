import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { assembleChapters, type Chapter } from "./assemble";
import { htmlToText } from "./html";
import type { ExtractedDocument } from "./types";

/** A page's rendered HTML, as captured from a tab or fetched by the server. */
export interface PageSnapshot {
  html: string;
  url: string;
  title?: string;
}

/**
 * Page furniture Readability tends to keep: citation markers, edit links,
 * navboxes, infoboxes and tables of contents (mostly Wikipedia/MediaWiki).
 */
const NOISE = [
  "script", "style", "noscript", "template", "iframe", "button",
  "sup.reference", ".mw-editsection", ".reflist", ".references", ".navbox", ".vertical-navbox",
  ".infobox", ".sidebar", ".hatnote", ".ambox", ".metadata", ".noprint", ".mw-jump-link",
  "#toc", ".toc", ".catlinks",
].join(",");

/** Sections at the back of an article that aren't worth speed reading. */
const BACK_MATTER =
  /^(references|notes|notes and references|footnotes|citations|sources|bibliography|works cited|further reading|see also|external links|related (articles|posts|stories|reading)|comments?|share this( article| post)?)$/i;

/** Inline markers like [1], [a], [citation needed] and [edit]. */
const INLINE_MARKERS = /\[(?:\d+|[a-z]|citation needed|clarification needed|note \d+|nb \d+|edit)\]/gi;

const HEADING_MARK = "\u0000";
const TRACKING_PARAMS = /^(utm_.*|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|_hsenc|_hsmi|mkt_tok)$/i;

/**
 * Turns a web page into a readable document: strips page furniture, keeps the
 * main article (Mozilla Readability), splits it into sections at headings and
 * drops back matter like references. Used by the extension on a tab snapshot
 * and by the web app's server-side URL import, so both behave the same.
 */
export function extractArticle(page: PageSnapshot): ExtractedDocument {
  const { document } = parseHTML(page.html);
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
  const url = canonicalUrl(page.url, canonical);
  const hostname = safeHostname(url);

  document.querySelectorAll(NOISE).forEach((el) => el.remove());
  const fallbackTitle = page.title?.trim() || document.title?.trim();
  const article = new Readability(document as unknown as Document, { charThreshold: 250 }).parse();

  let root: Element;
  if (article?.content) {
    root = parseHTML(`<!doctype html><html><body>${article.content}</body></html>`).document.body as unknown as Element;
  } else {
    // Readability gave up (very short or unusual page): use the body minus obvious chrome.
    document.querySelectorAll("nav, header, footer, aside, form").forEach((el) => el.remove());
    root = document.body as unknown as Element;
  }

  const siteName = clip(article?.siteName, 200) || hostname.replace(/^www\./, "") || undefined;
  const title = stripSiteSuffix(article?.title?.trim() || fallbackTitle || hostname || "Untitled", siteName, hostname);
  const { text, sections } = assembleChapters(splitAtHeadings(root));

  return {
    title: title.slice(0, 300),
    text,
    sections,
    sourceType: "url",
    sourceName: url,
    author: cleanByline(article?.byline),
    siteName,
  };
}

/** Replaces headings with markers, converts to text, and cuts it into chapters. */
function splitAtHeadings(root: Element): Chapter[] {
  const doc = root.ownerDocument;
  for (const h of Array.from(root.querySelectorAll("h1, h2, h3"))) {
    const title = (h.textContent ?? "").replace(INLINE_MARKERS, "").replace(/\s+/g, " ").trim();
    h.replaceWith(doc.createTextNode(title ? `\n\n${HEADING_MARK}${title}\n\n` : "\n\n"));
  }
  const [intro, ...rest] = htmlToText(root).replace(INLINE_MARKERS, "").split(HEADING_MARK);
  const chapters: Chapter[] = [{ text: intro }];
  for (const chunk of rest) {
    const breakAt = chunk.indexOf("\n");
    const title = (breakAt === -1 ? chunk : chunk.slice(0, breakAt)).trim();
    if (BACK_MATTER.test(title)) continue;
    chapters.push({ title, text: breakAt === -1 ? "" : chunk.slice(breakAt + 1) });
  }
  return chapters;
}

/**
 * The URL a page is saved under, used to spot duplicates: the canonical link
 * when it's on the same site, without the fragment or tracking parameters.
 */
export function canonicalUrl(pageUrl: string, canonical?: string | null): string {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return pageUrl;
  }
  if (canonical) {
    try {
      const c = new URL(canonical, url);
      // Some sites point every page's canonical at the home page; ignore that.
      const sameSite = siteKey(c.hostname) === siteKey(url.hostname);
      if (c.protocol.startsWith("http") && sameSite && (c.pathname !== "/" || url.pathname === "/")) url = c;
    } catch {
      // Malformed canonical link: keep the page URL.
    }
  }
  url.hash = "";
  for (const key of Array.from(url.searchParams.keys())) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

/** Last two hostname labels, e.g. en.m.wikipedia.org -> wikipedia.org. */
function siteKey(hostname: string): string {
  return hostname.toLowerCase().split(".").slice(-2).join(".");
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** "Some article - Wikipedia" -> "Some article", when the suffix names the site. */
function stripSiteSuffix(title: string, siteName: string | undefined, hostname: string): string {
  const match = title.match(/^(.+?)\s+[-–—|·:]\s+([^-–—|·:]{2,60})$/);
  if (!match) return title;
  const suffix = match[2].trim().toLowerCase();
  const squashed = suffix.replace(/[^a-z0-9]/g, "");
  if (suffix === siteName?.toLowerCase() || (squashed.length > 2 && hostname.toLowerCase().replace(/[^a-z0-9]/g, "").includes(squashed))) {
    return match[1].trim();
  }
  return title;
}

function cleanByline(byline: string | null | undefined): string | undefined {
  const name = byline?.replace(/\s+/g, " ").replace(/^by\s+/i, "").trim();
  // Long "bylines" are usually a paragraph Readability misread.
  return name && name.length <= 120 ? name : undefined;
}

function clip(value: string | null | undefined, max: number): string | undefined {
  const v = value?.replace(/\s+/g, " ").trim();
  return v ? v.slice(0, max) : undefined;
}
