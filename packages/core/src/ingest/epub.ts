import { assembleChapters, titleFromFileName, type Chapter } from "./assemble";
import { htmlToText, parseHtml } from "./html";
import type { ExtractedDocument } from "./types";

/** Reads an EPUB's spine in order and returns its text, one section per chapter. */
export async function fromEpubFile(file: File): Promise<ExtractedDocument> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  const read = async (path: string) => {
    const entry = zip.file(path);
    if (!entry) throw new Error(`EPUB is missing ${path}`);
    return entry.async("string");
  };

  const container = parseHtml(await read("META-INF/container.xml"), "application/xml");
  const opfPath = container.querySelector("rootfile")?.getAttribute("full-path");
  if (!opfPath) throw new Error("EPUB has no package document");
  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  const opf = parseHtml(await read(opfPath), "application/xml");
  const title = opf.getElementsByTagName("dc:title")[0]?.textContent?.trim();

  const manifest = new Map<string, string>();
  for (const item of Array.from(opf.getElementsByTagName("item"))) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) manifest.set(id, resolvePath(opfDir, href));
  }

  const chapters: Chapter[] = [];
  for (const ref of Array.from(opf.getElementsByTagName("itemref"))) {
    const path = manifest.get(ref.getAttribute("idref") ?? "");
    if (!path || !zip.file(path)) continue;
    const doc = parseHtml(await read(path), "application/xhtml+xml");
    const body = doc.getElementsByTagName("body")[0] ?? doc.documentElement;
    const heading = body.querySelector("h1, h2, h3")?.textContent?.trim();
    chapters.push({ title: heading || undefined, text: htmlToText(body) });
  }

  const { text, sections } = assembleChapters(chapters);
  return {
    title: title || titleFromFileName(file.name),
    text,
    sections,
    sourceType: "file",
    sourceName: file.name,
  };
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
