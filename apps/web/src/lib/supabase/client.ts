import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@speedread/core/data";
import { supabaseKey, supabaseUrl } from "@/lib/env";

/** Browser client. Session lives in cookies so server components see it too. */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
