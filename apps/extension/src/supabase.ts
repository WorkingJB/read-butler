import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import type { Database } from "@speedread/core/data";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const webAppUrl = import.meta.env.VITE_WEB_APP_URL ?? "";

/** Keeps the session in chrome.storage.local so it survives the panel closing. */
const chromeStorage: SupportedStorage = {
  getItem: async (key) => ((await chrome.storage.local.get(key))[key] as string | undefined) ?? null,
  setItem: (key, value) => chrome.storage.local.set({ [key]: value }),
  removeItem: (key) => chrome.storage.local.remove(key),
};

export const supabase = createClient<Database>(supabaseUrl || "http://localhost", supabaseKey || "missing", {
  auth: {
    storage: chromeStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});
