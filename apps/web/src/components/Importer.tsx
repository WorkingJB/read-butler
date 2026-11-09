"use client";

import { useState } from "react";
import { ACCEPTED_FILE_TYPES, extractFile, fromPlainText, type ExtractedDocument } from "@readbutler/core/ingest";
import { MAX_BODY_CHARS } from "@readbutler/core";
import { PDF_WORKER_SRC } from "@/lib/env";

type Tab = "paste" | "file" | "url";

export function Importer({
  onImported,
  allowUrl = false,
  submitLabel = "Read",
}: {
  onImported: (doc: ExtractedDocument) => Promise<void> | void;
  allowUrl?: boolean;
  submitLabel?: string;
}) {
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(task: () => Promise<ExtractedDocument>) {
    setBusy(true);
    setError(null);
    try {
      const doc = await task();
      if (!doc.text) throw new Error("No readable text found.");
      if (doc.text.length > MAX_BODY_CHARS) throw new Error("That text is too long (about 500,000 words max).");
      await onImported(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const tabs: Tab[] = allowUrl ? ["paste", "file", "url"] : ["paste", "file"];

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "btn btn-primary" : "btn"}
            onClick={() => setTab(t)}
          >
            {t === "paste" ? "Paste text" : t === "file" ? "Upload file" : "Web page"}
          </button>
        ))}
      </div>

      {tab === "paste" && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => fromPlainText(text, "paste", title));
          }}
        >
          <input className="input" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className="input min-h-64 font-mono"
            placeholder="Paste anything you want to read…"
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-primary" disabled={busy || !text.trim()}>
            {busy ? "Working…" : submitLabel}
          </button>
        </form>
      )}

      {tab === "file" && (
        <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-6 text-center">
          <span className="font-medium">{busy ? "Extracting text…" : "Choose or drop a file"}</span>
          <span className="text-sm text-muted">PDF, EPUB, DOCX, TXT, Markdown or HTML. Parsed on your device.</span>
          <input
            type="file"
            className="sr-only"
            accept={ACCEPTED_FILE_TYPES}
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) run(() => extractFile(file, { workerSrc: PDF_WORKER_SRC }));
              e.target.value = "";
            }}
          />
        </label>
      )}

      {tab === "url" && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const res = await fetch("/api/extract", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ url }),
              });
              const body = await res.json();
              if (!res.ok) throw new Error(body.error ?? "Could not import that page.");
              return body as ExtractedDocument;
            });
          }}
        >
          <input
            className="input"
            type="url"
            required
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Fetching…" : "Import"}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-accent">{error}</p>}
    </div>
  );
}
