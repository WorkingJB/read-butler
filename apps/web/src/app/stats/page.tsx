import { getDailyStats, getProfile } from "@readbutler/core/data";
import { requireUser } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Progress · Read Butler" };

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
          <SettingsForm profile={profile} />
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
