import { useState } from "react";
import { MAX_BODY_CHARS } from "@speedread/core";
import { ACCEPTED_FILE_TYPES, extractFile, fromPlainText, type ExtractedDocument } from "@speedread/core/ingest";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

export function Import({ onImported }: { onImported: (doc: ExtractedDocument) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(task: () => Promise<ExtractedDocument>) {
    setBusy(true);
    setError(null);
    try {
      const doc = await task();
      if (!doc.text) throw new Error("No readable text found.");
      if (doc.text.length > MAX_BODY_CHARS) throw new Error("That text is too long.");
      onImported(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="import">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => fromPlainText(text, "paste"));
        }}
      >
        <textarea placeholder="Paste text to speed read…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="primary" disabled={busy || !text.trim()}>
          Read
        </button>
      </form>

      <label className="drop">
        <span>{busy ? "Extracting text…" : "Or upload a PDF, EPUB, DOCX, TXT or HTML file"}</span>
        <input
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) run(() => extractFile(file, { workerSrc: pdfWorkerUrl }));
            e.target.value = "";
          }}
        />
      </label>

      <p className="hint">Tip: select text on any page, right-click, and choose “Speed read selection”.</p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
