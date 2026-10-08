import { assembleChapters, titleFromFileName } from "./assemble";
import type { ExtractedDocument } from "./types";

export async function fromDocxFile(file: File): Promise<ExtractedDocument> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  const { text, sections } = assembleChapters([{ text: value }]);
  return { title: titleFromFileName(file.name), text, sections, sourceType: "file", sourceName: file.name };
}
