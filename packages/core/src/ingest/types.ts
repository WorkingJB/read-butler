import type { Section } from "../reader/sections";

export type SourceType = "paste" | "file" | "url" | "selection";

export interface ExtractedDocument {
  title: string;
  text: string;
  sections: Section[];
  sourceType: SourceType;
  /** File name or URL the text came from. */
  sourceName?: string;
}

export class UnsupportedFileError extends Error {
  constructor(name: string) {
    super(`Unsupported file type: ${name}. Try PDF, EPUB, DOCX, TXT, Markdown or HTML.`);
    this.name = "UnsupportedFileError";
  }
}
