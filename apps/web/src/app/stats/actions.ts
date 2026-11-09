"use server";

import { revalidatePath } from "next/cache";
import { updateProfile } from "@readbutler/core/data";
import { requireUser } from "@/lib/supabase/server";

const int = (form: FormData, key: string, min: number, max: number) =>
  Math.min(Math.max(Math.round(Number(form.get(key)) || min), min), max);

export async function saveSettings(form: FormData) {
  const { supabase, userId } = await requireUser();
  await updateProfile(supabase, userId, {
    target_wpm: int(form, "target_wpm", 50, 1500),
    ramp_start_wpm: int(form, "ramp_start_wpm", 50, 1500),
    ramp_step_wpm: int(form, "ramp_step_wpm", 5, 200),
    ramp_step_words: int(form, "ramp_step_words", 25, 5000),
    ramp_enabled: form.get("ramp_enabled") === "on",
  });
  revalidatePath("/stats");
}
