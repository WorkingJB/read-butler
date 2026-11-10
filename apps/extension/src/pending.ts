import { fromPlainText } from "@readbutler/core/ingest";
import { PENDING_KEY, type Pending } from "./messages";

export { PENDING_KEY };

/** Takes (and clears) whatever the background worker left for the panel. */
export async function takePending(): Promise<Pending | null> {
  const { [PENDING_KEY]: value } = await chrome.storage.session.get(PENDING_KEY);
  if (!value) return null;
  await chrome.storage.session.remove(PENDING_KEY);
  return value as Pending;
}

/** A speed-read selection as a document the reader can open. */
export function selectionDocument(p: Extract<Pending, { kind: "text" }>) {
  return { ...fromPlainText(p.text, "selection", p.title), sourceName: p.sourceName };
}
