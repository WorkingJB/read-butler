import type { Checkpoint } from "./useRsvp";

/** Maps a reader checkpoint to a `reading_sessions` row. */
export function checkpointToSession(c: Checkpoint, documentId: string | null, client: "web" | "extension") {
  const s = c.session;
  return {
    id: s.id,
    document_id: documentId,
    client,
    started_at: s.startedAt.toISOString(),
    ended_at: new Date(Math.max(Date.now(), s.startedAt.getTime())).toISOString(),
    start_word_index: s.startIndex,
    end_word_index: s.endIndex,
    words_read: s.wordsRead,
    active_ms: s.activeMs,
    start_wpm: s.startWpm,
    end_wpm: s.endWpm,
  };
}
