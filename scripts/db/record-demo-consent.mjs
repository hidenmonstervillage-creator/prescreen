// npm run db:demo-consent: one-off, Mike only (CLAUDE.md rule 8). Records consent on the four
// fictional demo rows from session A1 and A2, which were submitted before the public page had
// its consent box (migration 0003). consent_at is the time this runs, not the submission time.
// Matches the exact fictional contacts only and never touches any other row. Prints counts only.
import { createClient } from "@supabase/supabase-js";
import { assertSupabaseEnv } from "../../lib/env-guard.ts";
import { loadEnvFile } from "../lib/env-file.mjs";
import { scrub } from "../lib/scrub.mjs";

const values = loadEnvFile();
assertSupabaseEnv(process.env, { requireServiceKey: true });

/** The checkpoint row and rows A, B and C (docs/handoff.md). All invented. */
const DEMO_CONTACTS = [
  "Mira Fictiva (fictional patient), +359 00 000 0000",
  "Lora Primerna (fictional patient), +359 00 000 0001",
  "Vesela Izmislena (fictional patient), +359 00 000 0002",
  "Petar Primerov (fictional patient), +359 00 000 0003",
];

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await db
  .from("submissions")
  .update({ consent_given: true, consent_at: new Date().toISOString() })
  .in("contact", DEMO_CONTACTS)
  .eq("consent_given", false)
  .select("id");
if (error) {
  console.error(`demo consent: FAIL ${scrub(error.message, values)}`);
  process.exitCode = 1;
} else {
  const { count } = await db
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .in("contact", DEMO_CONTACTS)
    .eq("consent_given", true);
  console.log(`demo consent: ${data.length} rows updated now, ${count} of ${DEMO_CONTACTS.length} demo rows have consent recorded`);
}
