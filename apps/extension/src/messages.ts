import type { ExtractedDocument } from "@readbutler/core/ingest";

/**
 * Work handed from the background worker to the side panel (context menu and
 * keyboard actions), via chrome.storage.session: cleared when the browser
 * closes and never synced.
 */
export const PENDING_KEY = "pendingText";

export type Pending =
  /** A selection to speed read; plain text, split into words by the panel. */
  | { kind: "text"; text: string; title?: string; sourceName?: string }
  /** A page already extracted by the background worker, to read or to save. */
  | { kind: "article"; doc: ExtractedDocument; save: boolean }
  | { kind: "error"; message: string };
