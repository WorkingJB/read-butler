import { PENDING_KEY, type PendingText } from "./messages";

const MENU_SELECTION = "speed-read-selection";
const MENU_PAGE = "speed-read-page";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  chrome.contextMenus.create({ id: MENU_SELECTION, title: "Speed read selection", contexts: ["selection"] });
  chrome.contextMenus.create({ id: MENU_PAGE, title: "Speed read this page", contexts: ["page"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || tab.windowId === undefined) return;

  // sidePanel.open must run synchronously inside the user gesture, so open
  // first and deliver the text through session storage afterwards.
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);

  const deliver = (pending: PendingText) => chrome.storage.session.set({ [PENDING_KEY]: pending });
  const title = tab.title;

  if (info.menuItemId === MENU_SELECTION && info.selectionText) {
    const fallback = info.selectionText;
    // selectionText is flattened; read the real selection to keep paragraph breaks.
    readFromTab(tab.id, "selection")
      .then((text) => deliver({ text: text || fallback, title, sourceType: "selection", sourceName: tab.url }))
      .catch(() => deliver({ text: fallback, title, sourceType: "selection", sourceName: tab.url }));
  } else if (info.menuItemId === MENU_PAGE) {
    readFromTab(tab.id, "page")
      .then((text) => deliver({ text, title, sourceType: "url", sourceName: tab.url }))
      .catch(console.error);
  }
});

/** Runs in the page (activeTab grants access after the context menu click). */
async function readFromTab(tabId: number, what: "selection" | "page"): Promise<string> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    args: [what],
    func: (mode: "selection" | "page") => {
      if (mode === "selection") return window.getSelection()?.toString() ?? "";
      const root = document.querySelector("article") ?? document.querySelector("main") ?? document.body;
      return (root as HTMLElement).innerText;
    },
  });
  return (result?.result as string | undefined) ?? "";
}
