import type { Section } from "../reader/sections";

export type SourceType = "paste" | "file" | "url" | "selection";

export interface ExtractedDocument {
  title: string;
  text: string;
  sections: Section[];
  sourceType: SourceType;
  /** File name or URL the text came from. */
  sourceName?: string;
  author?: string;
  /** Publication or website name, e.g. "Wikipedia". */
  siteName?: string;
}

export class UnsupportedFileError extends Error {
  constructor(name: string) {
    super(`Unsupported file type: ${name}. Try PDF, EPUB, DOCX, TXT, Markdown or HTML.`);
    this.name = "UnsupportedFileError";
  }
}

export class DrmProtectedError extends Error {
  constructor() {
    super(
      "This EPUB is DRM-protected, so its text can't be read. Read Butler works with DRM-free EPUBs, such as Project Gutenberg books or titles a publisher sells without DRM.",
    );
    this.name = "DrmProtectedError";
  }
}
