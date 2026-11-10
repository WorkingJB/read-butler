"use client";

import { useRouter } from "next/navigation";
import { saveDocument } from "@readbutler/core/data";
import { Importer } from "@/components/Importer";
import { createClient } from "@/lib/supabase/client";

export function NewDocument() {
  const router = useRouter();
  return (
    <Importer
      allowUrl
      submitLabel="Save and read"
      onImported={async (doc) => {
        // Written straight from the browser to Supabase: large books never pass
        // through a Vercel function, and RLS ties the row to the signed-in user.
        // A page that's already saved opens the existing copy instead of duplicating it.
        const { row } = await saveDocument(createClient(), doc);
        router.push(`/read/${row.id}`);
      }}
    />
  );
}
