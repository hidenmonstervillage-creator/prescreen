// npm run env:check                 report which keys are set and run the env guard
// npm run env:check -- --derive-ref  first fill EXPECTED_SUPABASE_REF from NEXT_PUBLIC_SUPABASE_URL
// Prints variable names and pass or fail only, never a value.
import { checkSupabaseEnv, refFromSupabaseUrl } from "../lib/env-guard.ts";
import { ENV_KEYS, readEnvFile, writeEnvValue } from "./lib/env-file.mjs";

let { values } = readEnvFile();

if (process.argv.includes("--derive-ref")) {
  const ref = refFromSupabaseUrl(values.NEXT_PUBLIC_SUPABASE_URL ?? "");
  if (!ref) {
    console.error("cannot derive EXPECTED_SUPABASE_REF: NEXT_PUBLIC_SUPABASE_URL is empty or not https://<ref>.supabase.co");
    process.exit(1);
  }
  writeEnvValue("EXPECTED_SUPABASE_REF", ref);
  ({ values } = readEnvFile());
  console.log("EXPECTED_SUPABASE_REF derived from NEXT_PUBLIC_SUPABASE_URL and written to .env.local");
}

for (const key of ENV_KEYS) {
  console.log(`${key.padEnd(28)} ${values[key] ? "set" : "EMPTY"}`);
}
for (const key of Object.keys(values)) {
  if (!ENV_KEYS.includes(key)) console.log(`${key.padEnd(28)} unexpected key`);
}

const problems = [];
if ("OPENAI_API_KEY" in values) problems.push("OPENAI_API_KEY must not be in .env.local (it comes from the Windows environment)");
console.log(`${"OPENAI_API_KEY (environment)".padEnd(28)} ${process.env.OPENAI_API_KEY ? "set" : "MISSING"}`);
if (!process.env.OPENAI_API_KEY) problems.push("OPENAI_API_KEY is not set in the environment");

problems.push(...checkSupabaseEnv(values, { requireDbUrl: true, requireServiceKey: true }));

if (problems.length) {
  console.error(`\nenv guard: FAIL\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("\nenv guard: PASS (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_DB_URL and keys match EXPECTED_SUPABASE_REF)");
