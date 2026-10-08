import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { DEFAULT_RAMP, type RampSettings } from "@speedread/core";
import type { ExtractedDocument } from "@speedread/core/ingest";
import { createDocument, getDocument, getProfile, rampFromProfile } from "@speedread/core/data";
import { PENDING_KEY, takePending } from "../pending";
import { loadLocal, type LocalDocument } from "../local";
import { supabase, supabaseConfigured } from "../supabase";
import { Account } from "./Account";
import { Import } from "./Import";
import { Library } from "./Library";
import { Reader, type OpenDocument } from "./Reader";

type View = "import" | "library" | "account";

export function App() {
  const [view, setView] = useState<View>("import");
  const [session, setSession] = useState<Session | null>(null);
  const [ramp, setRamp] = useState<RampSettings>(DEFAULT_RAMP);
  const [open, setOpen] = useState<OpenDocument | null>(null);
  const [local, setLocal] = useState<LocalDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signedIn = Boolean(session);

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    getProfile(supabase)
      .then((p) => p && setRamp(rampFromProfile(p)))
      .catch(() => {});
  }, [session]);

  const openExtracted = useCallback((doc: ExtractedDocument, index = 0) => {
    setOpen({ doc, documentId: null, initialIndex: index, key: Date.now() });
  }, []);

  // Text sent from the context menu, both on first open and while the panel is open.
  useEffect(() => {
    takePending().then((doc) => {
      if (doc) openExtracted(doc);
      else loadLocal().then(setLocal);
    });
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "session" && changes[PENDING_KEY]?.newValue) {
        takePending().then((doc) => doc && openExtracted(doc));
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, [openExtracted]);

  async function saveToLibrary() {
    if (!open || open.documentId) return;
    setError(null);
    try {
      const row = await createDocument(supabase, open.doc);
      setOpen({ ...open, documentId: row.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function openFromLibrary(id: string) {
    setError(null);
    try {
      const d = await getDocument(supabase, id);
      if (!d) throw new Error("Document not found");
      setOpen({
        doc: { title: d.title, text: d.body, sections: d.sections, sourceType: d.source_type, sourceName: d.source_name ?? undefined },
        documentId: d.id,
        initialIndex: d.progress?.completed_at ? 0 : (d.progress?.word_index ?? 0),
        key: Date.now(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (open) {
    return (
      <Reader
        key={open.key}
        open={open}
        ramp={ramp}
        signedIn={signedIn}
        onSave={saveToLibrary}
        onClose={() => {
          setOpen(null);
          loadLocal().then(setLocal);
        }}
        error={error}
      />
    );
  }

  return (
    <div className="panel">
      <nav className="tabs">
        <button className={view === "import" ? "active" : ""} onClick={() => setView("import")}>
          Read
        </button>
        {signedIn && (
          <button className={view === "library" ? "active" : ""} onClick={() => setView("library")}>
            Library
          </button>
        )}
        <button className={view === "account" ? "active" : ""} onClick={() => setView("account")}>
          {signedIn ? "Account" : "Sign in"}
        </button>
      </nav>

      {error && <p className="error">{error}</p>}

      {view === "import" && (
        <>
          {local && (
            <button className="continue" onClick={() => openExtracted(local.doc, local.index)}>
              Continue “{local.doc.title}”
            </button>
          )}
          <Import onImported={(doc) => openExtracted(doc)} />
        </>
      )}
      {view === "library" && signedIn && <Library onOpen={openFromLibrary} />}
      {view === "account" && <Account session={session} />}
    </div>
  );
}
