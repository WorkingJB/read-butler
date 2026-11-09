import { useEffect, useState } from "react";
import { listDocuments, type LibraryItem } from "@readbutler/core/data";
import { supabase, webAppUrl } from "../supabase";

export function Library({ onOpen }: { onOpen: (id: string) => void }) {
  const [docs, setDocs] = useState<LibraryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments(supabase, 50)
      .then(setDocs)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!docs) return <p className="hint">Loading…</p>;
  if (docs.length === 0) return <p className="hint">Your library is empty. Save something you read to see it here.</p>;

  return (
    <>
      <ul className="library">
        {docs.map((d) => {
          const pct = d.progress ? Math.round(((d.progress.word_index + 1) / Math.max(d.word_count, 1)) * 100) : 0;
          return (
            <li key={d.id}>
              <button onClick={() => onOpen(d.id)}>
                <strong>{d.title}</strong>
                <span>
                  {d.word_count.toLocaleString()} words · {d.progress?.completed_at ? "finished" : `${pct}%`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {webAppUrl && (
        <a className="hint" href={`${webAppUrl}/library`} target="_blank" rel="noreferrer">
          Open full library and stats ↗
        </a>
      )}
    </>
  );
}
