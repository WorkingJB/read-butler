"use client";

import { startTransition, useActionState, useState } from "react";
import type { ProfileRow } from "@readbutler/core/data";
import { saveSettings, type SaveSettingsState } from "./actions";

/** Speed training settings, with visible saving / saved / error feedback. */
export function SettingsForm({ profile }: { profile: ProfileRow }) {
  const [state, action, pending] = useActionState<SaveSettingsState, FormData>(saveSettings, { status: "idle" });
  // Hide "Saved" once the user edits again, so it never vouches for unsaved changes.
  const [dirty, setDirty] = useState(false);

  return (
    <form
      onChange={() => setDirty(true)}
      onSubmit={(e) => {
        // Submit manually rather than via `action`, so React doesn't reset the fields afterwards
        // (a failed save would otherwise wipe the user's edits).
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setDirty(false);
        startTransition(() => action(data));
      }}
      className="grid max-w-xl gap-4 sm:grid-cols-2"
    >
      <Field label="Target speed (wpm)" name="target_wpm" defaultValue={profile.target_wpm} min={50} max={1500} />
      <Field label="Warm-up start (wpm)" name="ramp_start_wpm" defaultValue={profile.ramp_start_wpm} min={50} max={1500} />
      <Field label="Step size (wpm)" name="ramp_step_wpm" defaultValue={profile.ramp_step_wpm} min={5} max={200} />
      <Field label="Words per step" name="ramp_step_words" defaultValue={profile.ramp_step_words} min={25} max={5000} />
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="ramp_enabled" defaultChecked={profile.ramp_enabled} /> Warm up at the start of
        each session
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn btn-primary w-fit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <p className="text-sm" role="status" aria-live="polite">
          {!pending && !dirty && state.status === "saved" && <span className="text-muted">Saved</span>}
          {!pending && state.status === "error" && <span className="text-accent">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}

function Field(props: { label: string; name: string; defaultValue: number; min: number; max: number }) {
  return (
    <label className="space-y-1 text-sm">
      <span>{props.label}</span>
      <input className="input" type="number" name={props.name} defaultValue={props.defaultValue} min={props.min} max={props.max} required />
    </label>
  );
}
