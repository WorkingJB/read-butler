"use client";

import { useEffect, useState } from "react";
import type { GutenbergBook } from "@/lib/books";

/** Searches Project Gutenberg's public-domain catalog; shows popular books until you search. */
export function BookSearch({ busy, onAdd }: { busy: boolean; onAdd: (book: GutenbergBook) => void }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [books, setBooks] = useState<GutenbergBook[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/books/search?q=${encodeURIComponent(submitted)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Search failed.");
        if (!cancelled) setBooks(body.books);
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [submitted]);

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setBooks(null);
          setError(null);
          setSubmitted(query.trim());
        }}
      >
        <input
          className="input"
          type="search"
          placeholder="Search by title or author"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn btn-primary">Search</button>
      </form>
      <p className="text-sm text-muted">
        Free public-domain books from Project Gutenberg. {submitted ? `Results for “${submitted}”.` : "Most popular right now."}
      </p>

      {error && <p className="text-sm text-accent">{error}</p>}
      {!books && !error && <p className="text-sm text-muted">Loading…</p>}
      {books?.length === 0 && <p className="text-sm text-muted">No books found. Try another title or author.</p>}

      {books && books.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {books.map((b) => (
            <li key={b.id} className="flex items-center gap-4 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{b.title}</p>
                <p className="truncate text-sm text-muted">{b.authors.join(", ") || "Unknown author"}</p>
              </div>
              <button
                className="btn shrink-0"
                disabled={busy}
                onClick={() => {
                  setAdding(b.id);
                  onAdd(b);
                }}
              >
                {busy && adding === b.id ? "Adding…" : "Add"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
