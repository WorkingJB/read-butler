import type { SupabaseClient } from "@supabase/supabase-js";
import type { RampSettings } from "../reader/ramp";
import type { Section } from "../reader/sections";
import type { ExtractedDocument } from "../ingest/types";
import type { Database } from "./database.types";

export type { Database, DocumentSource, Json } from "./database.types";

/**
 * Data access shared by the web app and the extension. Every call runs with
 * the signed-in user's JWT; row level security does the authorization.
 */
export type Client = SupabaseClient<Database>;

type Tables = Database["public"]["Tables"];
export type DocumentRow = Tables["documents"]["Row"];
export type ProfileRow = Tables["profiles"]["Row"];
export type ProgressRow = Tables["reading_progress"]["Row"];
export type NewSession = Tables["reading_sessions"]["Insert"];

export interface LibraryItem extends DocumentRow {
  progress: Pick<ProgressRow, "word_index" | "completed_at" | "updated_at"> | null;
}

export interface FullDocument extends DocumentRow {
  body: string;
  sections: Section[];
  progress: ProgressRow | null;
}

function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? "Unknown Supabase error");
}

export async function createDocument(db: Client, doc: ExtractedDocument): Promise<DocumentRow> {
  const { data, error } = await db.rpc("create_document", {
    p_title: doc.title,
    p_source_type: doc.sourceType,
    p_body: doc.text,
    p_source_name: doc.sourceName ?? null,
    p_sections: doc.sections as unknown as Database["public"]["Functions"]["create_document"]["Args"]["p_sections"],
  });
  if (error || !data) fail(error);
  return data;
}

export async function listDocuments(db: Client, limit = 100): Promise<LibraryItem[]> {
  const [docs, progress] = await Promise.all([
    db.from("documents").select("*").order("created_at", { ascending: false }).limit(limit),
    db.from("reading_progress").select("document_id, word_index, completed_at, updated_at"),
  ]);
  if (docs.error) fail(docs.error);
  if (progress.error) fail(progress.error);

  const byDoc = new Map(progress.data.map((p) => [p.document_id, p]));
  return docs.data.map((d) => {
    const p = byDoc.get(d.id);
    return { ...d, progress: p ? { word_index: p.word_index, completed_at: p.completed_at, updated_at: p.updated_at } : null };
  });
}

export async function getDocument(db: Client, id: string): Promise<FullDocument | null> {
  const [doc, content, progress] = await Promise.all([
    db.from("documents").select("*").eq("id", id).maybeSingle(),
    db.from("document_contents").select("body, sections").eq("document_id", id).maybeSingle(),
    db.from("reading_progress").select("*").eq("document_id", id).maybeSingle(),
  ]);
  if (doc.error) fail(doc.error);
  if (content.error) fail(content.error);
  if (progress.error) fail(progress.error);
  if (!doc.data || !content.data) return null;

  return {
    ...doc.data,
    body: content.data.body,
    sections: (content.data.sections ?? []) as unknown as Section[],
    progress: progress.data,
  };
}

export async function deleteDocument(db: Client, id: string): Promise<void> {
  const { error } = await db.from("documents").delete().eq("id", id);
  if (error) fail(error);
}

export async function saveProgress(
  db: Client,
  documentId: string,
  wordIndex: number,
  wpm: number,
  completed = false,
): Promise<void> {
  const { error } = await db.from("reading_progress").upsert(
    {
      document_id: documentId,
      word_index: wordIndex,
      wpm: Math.round(wpm),
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "document_id" },
  );
  if (error) fail(error);
}

/** Upserts by the client-generated id, so it is safe to call at every checkpoint. */
export async function saveSession(db: Client, session: NewSession): Promise<void> {
  if (session.words_read === 0) return;
  const { error } = await db.from("reading_sessions").upsert(session, { onConflict: "id" });
  if (error) fail(error);
}

export async function rateSession(db: Client, sessionId: string, comprehension: number): Promise<void> {
  const { error } = await db.from("reading_sessions").update({ comprehension }).eq("id", sessionId);
  if (error) fail(error);
}

export async function getDailyStats(db: Client, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await db.from("daily_reading_stats").select("*").gte("day", since).order("day");
  if (error) fail(error);
  return data;
}

export async function getProfile(db: Client): Promise<ProfileRow | null> {
  const { data, error } = await db.from("profiles").select("*").maybeSingle();
  if (error) fail(error);
  return data;
}

export async function updateProfile(db: Client, userId: string, patch: Tables["profiles"]["Update"]): Promise<void> {
  const { error } = await db.from("profiles").update(patch).eq("id", userId);
  if (error) fail(error);
}

export function rampFromProfile(p: ProfileRow): RampSettings {
  return {
    enabled: p.ramp_enabled,
    startWpm: p.ramp_start_wpm,
    targetWpm: p.target_wpm,
    stepWpm: p.ramp_step_wpm,
    stepEveryWords: p.ramp_step_words,
  };
}

