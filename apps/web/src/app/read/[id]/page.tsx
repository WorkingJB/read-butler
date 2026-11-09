import { notFound } from "next/navigation";
import { DEFAULT_RAMP } from "@readbutler/core";
import { getDocument, getProfile, rampFromProfile } from "@readbutler/core/data";
import { requireUser } from "@/lib/supabase/server";
import { ReaderScreen } from "./ReaderScreen";

export default async function ReadPage({ params }: PageProps<"/read/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [doc, profile] = await Promise.all([getDocument(supabase, id), getProfile(supabase)]);
  if (!doc) notFound();

  const startAt = doc.progress?.completed_at ? 0 : (doc.progress?.word_index ?? 0);

  return (
    <ReaderScreen
      documentId={doc.id}
      title={doc.title}
      text={doc.body}
      sections={doc.sections}
      initialIndex={startAt}
      ramp={profile ? rampFromProfile(profile) : DEFAULT_RAMP}
      fontScale={profile?.font_scale ?? 1}
    />
  );
}
