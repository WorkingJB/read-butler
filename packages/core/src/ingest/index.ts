import { MAX_UPLOAD_BYTES } from "../limits";
import { fromDocxFile } from "./docx";
import { fromEpubFile } from "./epub";
import { fromPdfFile, type PdfOptions } from "./pdf";
import { fromHtmlFile, fromTextFile } from "./text";
import { UnsupportedFileError, type ExtractedDocument } from "./types";

export * from "./types";
export { fromPlainText, stripMarkdown } from "./text";
export { assembleChapters } from "./assemble";
export { htmlToText } from "./html";

export const ACCEPTED_FILE_TYPES = ".pdf,.epub,.docx,.txt,.md,.markdown,.html,.htm";

/**
 * Extracts readable text from a file in the browser. Parsing runs client-side
 * so originals never leave the device and no serverless function has to
 * handle large uploads.
 */
export async function extractFile(file: File, opts: PdfOptions): Promise<ExtractedDocument> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`);
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return fromPdfFile(file, opts);
  if (name.endsWith(".epub")) return fromEpubFile(file);
  if (name.endsWith(".docx")) return fromDocxFile(file);
  if (/\.(html?|xhtml)$/.test(name)) return fromHtmlFile(file);
  if (/\.(txt|md|markdown)$/.test(name) || file.type.startsWith("text/")) return fromTextFile(file);
  throw new UnsupportedFileError(file.name);
}
