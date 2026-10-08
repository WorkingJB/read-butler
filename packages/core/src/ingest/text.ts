import { assembleChapters, titleFromFileName, titleFromText } from "./assemble";
import { htmlToText, parseHtml } from "./html";
import type { ExtractedDocument, SourceType } from "./types";

export function fromPlainText(text: string, sourceType: SourceType = "paste", title?: string): ExtractedDocument {
  const { text: body, sections } = assembleChapters([{ text }]);
  return { title: title?.trim() || titleFromText(body), text: body, sections, sourceType };
}

export async function fromTextFile(file: File): Promise<ExtractedDocument> {
  let text = await file.text();
  if (/\.(md|markdown)$/i.test(file.name)) text = stripMarkdown(text);
  return { ...fromPlainText(text, "file", titleFromFileName(file.name)), sourceName: file.name };
}

export async function fromHtmlFile(file: File): Promise<ExtractedDocument> {
  const doc = parseHtml(await file.text());
  const title = doc.title?.trim() || titleFromFileName(file.name);
  const { text, sections } = assembleChapters([{ text: htmlToText(doc.body) }]);
  return { title, text, sections, sourceType: "file", sourceName: file.name };
}

/** Removes the Markdown syntax that would otherwise be flashed as words. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/(\*\*|__|\*|_|`)(.+?)\1/g, "$2");
}
