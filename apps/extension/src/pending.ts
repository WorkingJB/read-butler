import { fromPlainText, type ExtractedDocument } from "@speedread/core/ingest";
import { PENDING_KEY, type PendingText } from "./messages";

export { PENDING_KEY };

export async function takePending(): Promise<ExtractedDocument | null> {
  const { [PENDING_KEY]: value } = await chrome.storage.session.get(PENDING_KEY);
  if (!value) return null;
  await chrome.storage.session.remove(PENDING_KEY);
  const p = value as PendingText;
  return { ...fromPlainText(p.text, p.sourceType, p.title), sourceName: p.sourceName };
}
