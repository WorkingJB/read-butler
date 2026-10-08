/**
 * Text handed from the background worker to the side panel (context menu
 * actions), via chrome.storage.session: cleared when the browser closes and
 * never synced. Kept import-free so the service worker bundle stays tiny.
 */
export const PENDING_KEY = "pendingText";

export interface PendingText {
  text: string;
  title?: string;
  sourceType: "selection" | "url";
  sourceName?: string;
}
