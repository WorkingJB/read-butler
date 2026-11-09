import type { ExtractedDocument } from "@readbutler/core/ingest";

/**
 * Signed-out readers keep their current document and position on the device,
 * so closing the panel doesn't lose their place.
 */
const KEY = "localDocument";

export interface LocalDocument {
  doc: ExtractedDocument;
  index: number;
}

export async function loadLocal(): Promise<LocalDocument | null> {
  const { [KEY]: value } = await chrome.storage.local.get(KEY);
  return (value as LocalDocument | undefined) ?? null;
}

export function saveLocal(value: LocalDocument): Promise<void> {
  return chrome.storage.local.set({ [KEY]: value });
}

export function clearLocal(): Promise<void> {
  return chrome.storage.local.remove(KEY);
}
