import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

// Singleton browser client — gracefully returns null if env vars are not set (build time)
export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null; // env vars not set (build time static pages)
  _client = createBrowserClient(url, key);
  return _client;
}
