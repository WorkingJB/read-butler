import Link from "next/link";
import { listDocuments } from "@readbutler/core/data";
import { requireUser } from "@/lib/supabase/server";
import { deleteDocumentAction } from "./actions";

export const metadata = { title: "Library · Read Butler" };

export default async function LibraryPage() {
  const { supabase } = await requireUser();
  const docs = await listDocuments(supabase);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Library</h1>
        <Link href="/library/new" className="btn btn-primary">
          Add text
        </Link>
      </div>

      {docs.length === 0 ? (
        <p className="text-muted">Nothing here yet. Add some text, or save a selection from the Chrome extension.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {docs.map((d) => {
            const read = d.progress ? Math.round(((d.progress.word_index + 1) / Math.max(d.word_count, 1)) * 100) : 0;
            return (
              <li key={d.id} className="flex items-center gap-4 p-4">
                <Link href={`/read/${d.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{d.title}</p>
                  <p className="text-sm text-muted">
                    {d.word_count.toLocaleString()} words · {d.progress?.completed_at ? "finished" : `${read}% read`} ·{" "}
                    {d.site_name ?? d.source_type}
                  </p>
                </Link>
                <form action={deleteDocumentAction.bind(null, d.id)}>
                  <button className="text-sm text-muted hover:text-accent" aria-label={`Delete ${d.title}`}>
                    Delete
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
