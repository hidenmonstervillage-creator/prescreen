// Service role Supabase client. Server side only: importing this from a client
// component fails the build (server-only), so the key never reaches a browser bundle.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseEnv } from "./env-guard";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  assertSupabaseEnv(process.env, { requireServiceKey: true });
  client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Next 14 caches fetch in server components by default; database reads must never be cached.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  return client;
}
