"use client";

import { useState } from "react";
import type { ExtractedDocument } from "@readbutler/core/ingest";
import { RsvpReader } from "@readbutler/reader-ui";
import { Importer } from "@/components/Importer";

export function TryReader() {
  const [doc, setDoc] = useState<ExtractedDocument | null>(null);

  if (!doc) return <Importer onImported={setDoc} />;
  return (
    <div className="space-y-4">
      <button className="btn" onClick={() => setDoc(null)}>
        ← Read something else
      </button>
      <RsvpReader text={doc.text} title={doc.title} sections={doc.sections} />
    </div>
  );
}
