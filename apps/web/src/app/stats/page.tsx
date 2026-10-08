import { getDailyStats, getProfile } from "@speedread/core/data";
import { requireUser } from "@/lib/supabase/server";
import { saveSettings } from "./actions";

export const metadata = { title: "Progress · Speed Read It" };

export default async function StatsPage() {
  const { supabase } = await requireUser();
  const [days, profile] = await Promise.all([getDailyStats(supabase, 30), getProfile(supabase)]);

  const totalWords = days.reduce((n, d) => n + d.words_read, 0);
  const maxWords = Math.max(1, ...days.map((d) => d.words_read));
  const recent = days.filter((d) => d.effective_wpm !== null).slice(-7);
  const avgWpm = recent.length ? Math.round(recent.reduce((n, d) => n + (d.effective_wpm ?? 0), 0) / recent.length) : null;

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">Progress</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Words read, last 30 days" value={totalWords.toLocaleString()} />
          <Stat label="Average speed, last 7 reading days" value={avgWpm ? `${avgWpm} wpm` : "–"} />
          <Stat label="Current target" value={profile ? `${profile.target_wpm} wpm` : "–"} />
        </div>
        {days.length > 0 && (
          <div className="flex h-40 items-end gap-1 rounded-xl border border-line p-3" aria-label="Words read per day">
            {days.map((d) => (
              <div
                key={d.day}
                className="flex-1 rounded-t bg-accent/70"
                style={{ height: `${(d.words_read / maxWords) * 100}%` }}
                title={`${d.day}: ${d.words_read} words at ${d.effective_wpm ?? "?"} wpm`}
              />
            ))}
          </div>
        )}
      </section>

      {profile && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Speed training</h2>
          <p className="text-sm text-muted">
            Each session starts at the warm-up speed and steps up to your target. Rate your comprehension at the end of
            a document and the target moves up or down by one step.
          </p>
          <form action={saveSettings} className="grid max-w-xl gap-4 sm:grid-cols-2">
            <Field label="Target speed (wpm)" name="target_wpm" defaultValue={profile.target_wpm} min={50} max={1500} />
            <Field label="Warm-up start (wpm)" name="ramp_start_wpm" defaultValue={profile.ramp_start_wpm} min={50} max={1500} />
            <Field label="Step size (wpm)" name="ramp_step_wpm" defaultValue={profile.ramp_step_wpm} min={5} max={200} />
            <Field label="Words per step" name="ramp_step_words" defaultValue={profile.ramp_step_words} min={25} max={5000} />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="ramp_enabled" defaultChecked={profile.ramp_enabled} /> Warm up at the start of
              each session
            </label>
            <button className="btn btn-primary w-fit">Save</button>
          </form>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
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
