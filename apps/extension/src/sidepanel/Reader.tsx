import { suggestNextTarget, type RampSettings } from "@speedread/core";
import type { ExtractedDocument } from "@speedread/core/ingest";
import { rateSession, saveProgress, saveSession, updateProfile } from "@speedread/core/data";
import { checkpointToSession, RsvpReader, type Checkpoint } from "@speedread/reader-ui";
import { saveLocal } from "../local";
import { supabase } from "../supabase";

export interface OpenDocument {
  doc: ExtractedDocument;
  /** Set once the document is in the user's library; progress then syncs. */
  documentId: string | null;
  initialIndex: number;
  key: number;
}

export function Reader({
  open,
  ramp,
  signedIn,
  onSave,
  onClose,
  error,
}: {
  open: OpenDocument;
  ramp: RampSettings;
  signedIn: boolean;
  onSave: () => void;
  onClose: () => void;
  error: string | null;
}) {
  const { doc, documentId, initialIndex } = open;

  async function onCheckpoint(c: Checkpoint) {
    if (!documentId) {
      await saveLocal({ doc, index: c.index });
      return;
    }
    try {
      await Promise.all([
        saveProgress(supabase, documentId, c.index, c.wpm, c.finished),
        saveSession(supabase, checkpointToSession(c, documentId, "extension")),
      ]);
    } catch (e) {
      console.warn("Could not sync progress", e);
    }
  }

  async function onRate(rating: number, c: Checkpoint) {
    if (!documentId) return;
    await rateSession(supabase, c.session.id, rating);
    const next = suggestNextTarget(ramp, { endWpm: c.wpm, wordsRead: c.session.wordsRead, comprehension: rating });
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (userId && next !== ramp.targetWpm) await updateProfile(supabase, userId, { target_wpm: next });
  }

  return (
    <div className="panel">
      <div className="reader-bar">
        <button onClick={onClose}>← Back</button>
        {signedIn && !documentId && <button onClick={onSave}>Save to library</button>}
        {documentId && <span className="saved">Synced</span>}
      </div>
      {error && <p className="error">{error}</p>}
      <RsvpReader
        text={doc.text}
        title={doc.title}
        sections={doc.sections}
        initialIndex={initialIndex}
        ramp={ramp}
        onCheckpoint={onCheckpoint}
        onRateComprehension={documentId ? onRate : undefined}
      />
    </div>
  );
}
