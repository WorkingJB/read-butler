"use server";

import { revalidatePath } from "next/cache";
import { updateProfile } from "@readbutler/core/data";
import { requireUser } from "@/lib/supabase/server";

export type SaveSettingsState = { status: "idle" | "saved" | "error"; message?: string };

const int = (form: FormData, key: string, min: number, max: number) =>
  Math.min(Math.max(Math.round(Number(form.get(key)) || min), min), max);

export async function saveSettings(_prev: SaveSettingsState, form: FormData): Promise<SaveSettingsState> {
  const { supabase, userId } = await requireUser();
  try {
    await updateProfile(supabase, userId, {
      target_wpm: int(form, "target_wpm", 50, 1500),
      ramp_start_wpm: int(form, "ramp_start_wpm", 50, 1500),
      ramp_step_wpm: int(form, "ramp_step_wpm", 5, 200),
      ramp_step_words: int(form, "ramp_step_words", 25, 5000),
      ramp_enabled: form.get("ramp_enabled") === "on",
    });
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Couldn't save settings." };
  }
  revalidatePath("/stats");
  return { status: "saved" };
}
