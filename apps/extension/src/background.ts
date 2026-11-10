import { PENDING_KEY, type Pending } from "./messages";
import { extractFromTab } from "./page";

const MENU_SELECTION = "speed-read-selection";
const MENU_PAGE = "speed-read-page";
const MENU_SAVE = "save-page";
const COMMAND_SAVE = "save-page";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  chrome.contextMenus.create({ id: MENU_SELECTION, title: "Speed read selection", contexts: ["selection"] });
  chrome.contextMenus.create({ id: MENU_PAGE, title: "Speed read this page", contexts: ["page"] });
  chrome.contextMenus.create({ id: MENU_SAVE, title: "Save page to Read Butler", contexts: ["page"] });
});

const deliver = (pending: Pending) => chrome.storage.session.set({ [PENDING_KEY]: pending });

/** Extracts the tab's article in the worker and hands it to the side panel to read or save. */
function handlePage(tabId: number, save: boolean) {
  extractFromTab(tabId)
    .then((doc) => deliver({ kind: "article", doc, save }))
    .catch((e: unknown) => deliver({ kind: "error", message: e instanceof Error ? e.message : String(e) }));
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || tab.windowId === undefined) return;

  // sidePanel.open must run synchronously inside the user gesture, so open
  // first and deliver the result through session storage afterwards.
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);

  if (info.menuItemId === MENU_SELECTION && info.selectionText) {
    const fallback = info.selectionText;
    const base = { kind: "text" as const, title: tab.title, sourceName: tab.url };
    // selectionText is flattened; read the real selection to keep paragraph breaks.
    readSelection(tab.id)
      .then((text) => deliver({ ...base, text: text || fallback }))
      .catch(() => deliver({ ...base, text: fallback }));
  } else if (info.menuItemId === MENU_PAGE || info.menuItemId === MENU_SAVE) {
    handlePage(tab.id, info.menuItemId === MENU_SAVE);
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== COMMAND_SAVE || !tab?.id || tab.windowId === undefined) return;
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
  handlePage(tab.id, true);
});

/** Runs in the page (activeTab grants access after the context menu click). */
async function readSelection(tabId: number): Promise<string> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.getSelection()?.toString() ?? "",
  });
  return (result?.result as string | undefined) ?? "";
}
