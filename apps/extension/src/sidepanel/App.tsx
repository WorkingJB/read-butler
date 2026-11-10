import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { DEFAULT_RAMP, type RampSettings } from "@readbutler/core";
import type { ExtractedDocument } from "@readbutler/core/ingest";
import { getDocument, getProfile, rampFromProfile, saveDocument } from "@readbutler/core/data";
import type { Pending } from "../messages";
import { extractFromTab } from "../page";
import { PENDING_KEY, selectionDocument, takePending } from "../pending";
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
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Bumped to remount the library so it shows a page that was just saved.
  const [libraryKey, setLibraryKey] = useState(0);

  const signedIn = Boolean(session);
  const go = (next: View) => {
    setView(next);
    setNotice(null);
  };

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Reload on focus too: settings may have changed in the web app while the panel stayed open.
  useEffect(() => {
    if (!session) return;
    const load = () =>
      getProfile(supabase)
        .then((p) => p && setRamp(rampFromProfile(p)))
        .catch(() => {});
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [session]);

  const openExtracted = useCallback((doc: ExtractedDocument, index = 0) => {
    setOpen({ doc, documentId: null, initialIndex: index, key: Date.now() });
  }, []);

  const savePage = useCallback(async (doc: ExtractedDocument) => {
    const { row, existed } = await saveDocument(supabase, doc);
    setOpen(null);
    setView("library");
    setLibraryKey((k) => k + 1);
    setNotice(existed ? `“${row.title}” is already in your library.` : `Saved “${row.title}” to your library.`);
  }, []);

  const handlePending = useCallback(
    async (p: Pending) => {
      setError(null);
      setNotice(null);
      if (p.kind === "error") return setError(p.message);
      if (p.kind === "text") return openExtracted(selectionDocument(p));
      if (!p.save) return openExtracted(p.doc);
      // Check directly: the session state may not have loaded yet when the panel just opened.
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setView("account");
        return setNotice("Sign in to save pages to your library.");
      }
      await savePage(p.doc).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    },
    [openExtracted, savePage],
  );

  // Work sent from the context menu or shortcut, both on first open and while the panel is open.
  useEffect(() => {
    takePending().then((p) => {
      if (p) handlePending(p);
      else loadLocal().then(setLocal);
    });
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "session" && changes[PENDING_KEY]?.newValue) {
        takePending().then((p) => p && handlePending(p));
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, [handlePending]);

  /** The panel's own "Read this page" / "Save this page" buttons, for the active tab. */
  async function fromCurrentPage(save: boolean) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No page is open.");
      const doc = await extractFromTab(tab.id);
      if (save) await savePage(doc);
      else openExtracted(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveToLibrary() {
    if (!open || open.documentId) return;
    setError(null);
    try {
      const { row } = await saveDocument(supabase, open.doc);
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
        <button className={view === "import" ? "active" : ""} onClick={() => go("import")}>
          Read
        </button>
        {signedIn && (
          <button className={view === "library" ? "active" : ""} onClick={() => go("library")}>
            Library
          </button>
        )}
        <button className={view === "account" ? "active" : ""} onClick={() => go("account")}>
          {signedIn ? "Account" : "Sign in"}
        </button>
      </nav>

      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {view === "import" && (
        <>
          <div className="page-actions">
            <button disabled={busy} onClick={() => fromCurrentPage(false)}>
              Read this page
            </button>
            {signedIn && (
              <button disabled={busy} onClick={() => fromCurrentPage(true)}>
                {busy ? "Saving…" : "Save this page"}
              </button>
            )}
          </div>
          {local && (
            <button className="continue" onClick={() => openExtracted(local.doc, local.index)}>
              Continue “{local.doc.title}”
            </button>
          )}
          <Import onImported={(doc) => openExtracted(doc)} />
        </>
      )}
      {view === "library" && signedIn && <Library key={libraryKey} onOpen={openFromLibrary} />}
      {view === "account" && <Account session={session} />}
    </div>
  );
}
