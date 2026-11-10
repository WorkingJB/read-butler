import type JSZip from "jszip";
import { assembleChapters, titleFromFileName, type Chapter } from "./assemble";
import { htmlToText, parseHtml } from "./html";
import { DrmProtectedError, type ExtractedDocument } from "./types";

/** Font obfuscation also lists files in encryption.xml; these algorithms aren't DRM. */
const FONT_OBFUSCATION = new Set(["http://www.idpf.org/2008/embedding", "http://ns.adobe.com/pdf/enc#RC"]);

/** Spine documents that aren't reading material, by epub:type or role. */
const SKIP_TYPES = /\b(toc|index|copyright-page|footnotes|endnotes|rearnotes|landmarks|loi|lot|doc-toc|doc-index|doc-endnotes)\b/;
/** Same idea, by table-of-contents title. */
const SKIP_TITLES = /^(contents|table of contents|index|copyright|footnotes|endnotes)$/i;
/** Footnote references inside the text and the notes themselves. */
const NOTE_TYPES = /\b(noteref|footnote|endnote|rearnote|doc-noteref|doc-footnote|doc-endnote)\b/;

/** Project Gutenberg's licence header and footer. */
const PG_BOILERPLATE = '[id="pg-header"], [id="pg-footer"], .pg-boilerplate';
const PG_START = /\*{3}\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*{3}/i;
const PG_END = /\*{3}\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK/i;

/** "Some illustration caption. CHAPTER II." -> "CHAPTER II" (Gutenberg TOC labels include captions). */
const NUMBERED_HEADING = /\b(chapter|book|part|volume|act|scene|canto|letter|stave)\s+([0-9]+|[ivxlcdm]+)\b.*$/i;
const SPLIT_MARK = "\u0000";

interface TocEntry {
  fragment?: string;
  title: string;
}

interface ManifestItem {
  path: string;
  properties: string;
  mediaType: string;
}

/**
 * Reads an EPUB's spine in order and returns its text, one section per
 * chapter named from the book's own table of contents. Skips non-linear and
 * back-matter documents, footnote markers and Project Gutenberg boilerplate,
 * and refuses DRM-protected books with a clear error.
 */
export async function fromEpubFile(file: File): Promise<ExtractedDocument> {
  const { default: JSZipLib } = await import("jszip");
  const zip = await JSZipLib.loadAsync(await file.arrayBuffer()).catch(() => {
    throw new Error("That file isn't a valid EPUB.");
  });

  const read = async (path: string) => {
    const entry = zip.file(path);
    if (!entry) throw new Error(`EPUB is missing ${path}`);
    return entry.async("string");
  };

  await assertNotDrm(zip);

  const container = parseHtml(await read("META-INF/container.xml"), "application/xml");
  const opfPath = container.querySelector("rootfile")?.getAttribute("full-path");
  if (!opfPath) throw new Error("EPUB has no package document");
  const opfDir = dirOf(opfPath);

  const opf = parseHtml(await read(opfPath), "application/xml");
  const title = opf.getElementsByTagName("dc:title")[0]?.textContent?.trim();
  const author = opf.getElementsByTagName("dc:creator")[0]?.textContent?.replace(/\s+/g, " ").trim();

  const manifest = new Map<string, ManifestItem>();
  for (const item of Array.from(opf.getElementsByTagName("item"))) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (!id || !href) continue;
    manifest.set(id, {
      path: resolvePath(opfDir, href),
      properties: item.getAttribute("properties") ?? "",
      mediaType: item.getAttribute("media-type") ?? "",
    });
  }

  const spine = opf.getElementsByTagName("spine")[0];
  const toc = await readToc(zip, manifest, spine?.getAttribute("toc") ?? null);

  const refs = Array.from(opf.getElementsByTagName("itemref"));
  const linear = refs.filter((r) => r.getAttribute("linear") !== "no");

  const chapters: Chapter[] = [];
  for (const ref of linear.length ? linear : refs) {
    const item = manifest.get(ref.getAttribute("idref") ?? "");
    if (!item || /\bnav\b/.test(item.properties) || !zip.file(item.path)) continue;

    const doc = parseChapter(await read(item.path));
    const body = doc.getElementsByTagName("body")[0] ?? doc.documentElement;
    const entries = toc.get(item.path) ?? [];
    if (SKIP_TYPES.test(semantics(body)) || (entries[0] && SKIP_TITLES.test(entries[0].title))) continue;

    if (isLinkList(body)) continue;
    removeNoise(body);
    const { pieces, ended } = splitAtTocAnchors(body, entries);
    chapters.push(...pieces);
    if (ended) break;
  }

  const { text, sections } = assembleChapters(chapters);
  return {
    title: title || titleFromFileName(file.name),
    text,
    sections,
    sourceType: "file",
    sourceName: file.name,
    author: author || undefined,
  };
}

/**
 * Throws DrmProtectedError when encryption.xml lists anything encrypted with a
 * real cipher. Font obfuscation (an IDPF/Adobe scheme for embedded fonts) is
 * allowed, since the text itself is readable.
 */
async function assertNotDrm(zip: JSZip): Promise<void> {
  const entry = zip.file("META-INF/encryption.xml");
  if (!entry) return;
  const xml = parseHtml(await entry.async("string"), "application/xml");
  for (const data of byLocalName(xml, "EncryptedData")) {
    const method = byLocalName(data, "EncryptionMethod")[0]?.getAttribute("Algorithm") ?? "";
    if (!FONT_OBFUSCATION.has(method)) throw new DrmProtectedError();
  }
}

/** Maps each content file to its entries in the EPUB 3 nav or EPUB 2 NCX, in reading order. */
async function readToc(zip: JSZip, manifest: Map<string, ManifestItem>, ncxId: string | null): Promise<Map<string, TocEntry[]>> {
  const titles = new Map<string, TocEntry[]>();
  const add = (base: string, href: string | null, label: string | null | undefined) => {
    const title = label ? cleanTitle(label) : "";
    if (!href || !title) return;
    const path = resolvePath(base, href);
    const hash = href.indexOf("#");
    const fragment = hash === -1 ? undefined : decodeURIComponent(href.slice(hash + 1)) || undefined;
    const list = titles.get(path) ?? [];
    if (!list.some((e) => e.fragment === fragment)) list.push({ fragment, title });
    titles.set(path, list);
  };

  const nav = [...manifest.values()].find((m) => /\bnav\b/.test(m.properties));
  const navFile = nav && zip.file(nav.path);
  if (nav && navFile) {
    const doc = parseChapter(await navFile.async("string"));
    const navs = Array.from(doc.getElementsByTagName("nav"));
    const tocNav = navs.find((n) => /\btoc\b/.test(semantics(n))) ?? navs[0];
    for (const a of Array.from(tocNav?.getElementsByTagName("a") ?? [])) add(dirOf(nav.path), a.getAttribute("href"), a.textContent);
    if (titles.size) return titles;
  }

  const ncx = (ncxId && manifest.get(ncxId)) || [...manifest.values()].find((m) => m.mediaType === "application/x-dtbncx+xml");
  const ncxFile = ncx && zip.file(ncx.path);
  if (ncx && ncxFile) {
    const doc = parseHtml(await ncxFile.async("string"), "application/xml");
    for (const point of byLocalName(doc, "navPoint")) {
      const label = byLocalName(point, "text")[0]?.textContent;
      const src = byLocalName(point, "content")[0]?.getAttribute("src") ?? null;
      add(dirOf(ncx.path), src, label);
    }
  }
  return titles;
}

/** Parses a chapter as XHTML, falling back to HTML for files that aren't well-formed XML. */
function parseChapter(source: string): Document {
  const doc = parseHtml(source, "application/xhtml+xml");
  // Browsers reject XHTML using HTML-only entities like &nbsp;; the HTML parser accepts it.
  return doc.getElementsByTagName("parsererror").length ? parseHtml(source, "text/html") : doc;
}

function removeNoise(body: Element) {
  body.querySelectorAll(PG_BOILERPLATE).forEach((el) => el.remove());
  // Contents lists inside otherwise normal files (outermost first; removing one drops its children too).
  for (const el of Array.from(body.querySelectorAll("div, section, table, ul, ol, dl, p"))) {
    if (el.isConnected && isLinkList(el)) el.remove();
  }
  for (const el of Array.from(body.querySelectorAll("*"))) {
    if (NOTE_TYPES.test(semantics(el))) el.remove();
  }
}

/**
 * Cuts a content file into chapters at the anchors its TOC entries point to
 * (Gutenberg and many others put several chapters in one file). Also trims
 * Project Gutenberg's start/end markers; `ended` means the book is over.
 */
function splitAtTocAnchors(body: Element, entries: TocEntry[]): { pieces: Chapter[]; ended: boolean } {
  const doc = body.ownerDocument;
  const titles: string[] = [];
  for (const entry of entries) {
    if (!entry.fragment) continue;
    const anchor = body.querySelector(`[id="${entry.fragment.replace(/["\\]/g, "\\$&")}"]`);
    if (!anchor) continue;
    anchor.parentNode?.insertBefore(doc.createTextNode(`\n\n${SPLIT_MARK}${titles.length}\n\n`), anchor);
    titles.push(entry.title);
  }

  let text = htmlToText(body);
  const start = text.match(PG_START);
  if (start?.index !== undefined) text = text.slice(start.index + start[0].length);
  const end = text.match(PG_END);
  if (end?.index !== undefined) text = text.slice(0, end.index);

  const [lead, ...rest] = text.split(SPLIT_MARK);
  // Text before the first anchor continues the previous chapter, unless the TOC names the file itself.
  const fileTitle = entries.find((e) => !e.fragment)?.title ?? (titles.length ? undefined : entries[0]?.title ?? headingOf(body));
  const pieces: Chapter[] = [{ title: fileTitle, text: lead }];
  for (const chunk of rest) {
    const index = Number.parseInt(chunk, 10);
    pieces.push({ title: titles[index], text: chunk.replace(/^\d+/, "") });
  }
  return { pieces, ended: end?.index !== undefined };
}

/** A printed table of contents or list of illustrations: mostly links. */
function isLinkList(el: Element): boolean {
  const links = Array.from(el.querySelectorAll("a[href]"));
  if (links.length < 8) return false;
  const linkChars = links.reduce((n, a) => n + (a.textContent?.trim().length ?? 0), 0);
  const allChars = el.textContent?.replace(/\s+/g, "").length ?? 0;
  return allChars > 0 && linkChars / allChars > 0.5;
}

function headingOf(body: Element): string | undefined {
  const text = body.querySelector("h1, h2, h3")?.textContent;
  return text ? cleanTitle(text) : undefined;
}

function cleanTitle(raw: string): string {
  const title = raw.replace(/\s+/g, " ").trim();
  const numbered = title.match(NUMBERED_HEADING);
  return (numbered && numbered.index ? numbered[0] : title).replace(/[\s.:]+$/, "");
}

/** epub:type and ARIA role, which mark structure like footnotes and indexes. */
function semantics(el: Element): string {
  return `${el.getAttribute("epub:type") ?? ""} ${el.getAttribute("role") ?? ""}`;
}

/** Elements by local name, ignoring namespace prefixes (enc:, ncx:, …). */
function byLocalName(root: Document | Element, name: string): Element[] {
  return Array.from(root.querySelectorAll("*")).filter((el) => (el.localName || el.tagName).split(":").pop() === name);
}

function dirOf(path: string): string {
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
}

function resolvePath(base: string, href: string): string {
  const parts = (base + decodeURIComponent(href.split("#")[0])).split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "..") out.pop();
    else if (part !== "." && part !== "") out.push(part);
  }
  return out.join("/");
}
