"use server";

import { revalidatePath } from "next/cache";
import { deleteDocument } from "@readbutler/core/data";
import { requireUser } from "@/lib/supabase/server";

export async function deleteDocumentAction(id: string) {
  // Re-check auth inside the action; RLS also limits the delete to the owner.
  const { supabase } = await requireUser();
  await deleteDocument(supabase, id);
  revalidatePath("/library");
}
