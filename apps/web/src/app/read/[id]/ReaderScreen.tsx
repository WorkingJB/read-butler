"use client";

import { useMemo } from "react";
import Link from "next/link";
import { suggestNextTarget, type RampSettings, type Section } from "@readbutler/core";
import { rateSession, saveProgress, saveSession, updateProfile } from "@readbutler/core/data";
import { checkpointToSession, RsvpReader, type Checkpoint } from "@readbutler/reader-ui";
import { createClient } from "@/lib/supabase/client";

interface Props {
  documentId: string;
  title: string;
  text: string;
  sections: Section[];
  initialIndex: number;
  ramp: RampSettings;
  fontScale: number;
}

export function ReaderScreen({ documentId, title, text, sections, initialIndex, ramp, fontScale }: Props) {
  const supabase = useMemo(() => createClient(), []);

  async function onCheckpoint(c: Checkpoint) {
    try {
      await Promise.all([
        saveProgress(supabase, documentId, c.index, c.wpm, c.finished),
        saveSession(supabase, checkpointToSession(c, documentId, "web")),
      ]);
    } catch (e) {
      // Progress is best effort; the next checkpoint retries with fresher data.
      console.warn("Could not save progress", e);
    }
  }

  async function onRate(rating: number, c: Checkpoint) {
    await rateSession(supabase, c.session.id, rating);
    const next = suggestNextTarget(ramp, { endWpm: c.wpm, wordsRead: c.session.wordsRead, comprehension: rating });
    if (next !== ramp.targetWpm) {
      const { data } = await supabase.auth.getClaims();
      if (data?.claims?.sub) await updateProfile(supabase, data.claims.sub, { target_wpm: next });
    }
  }

  return (
    <div className="space-y-4">
      <Link href="/library" className="text-sm text-muted hover:text-foreground">
        ← Library
      </Link>
      <RsvpReader
        text={text}
        title={title}
        sections={sections}
        initialIndex={initialIndex}
        ramp={ramp}
        fontScale={fontScale}
        onCheckpoint={onCheckpoint}
        onRateComprehension={onRate}
      />
    </div>
  );
}
