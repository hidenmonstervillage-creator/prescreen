// npm run db:migrate: apply supabase/migrations/*.sql in order over SUPABASE_DB_URL.
// Each file runs in its own transaction and is recorded in private.schema_migrations.
// Runs the env guard first. Prints file names and pass or fail only, never a value.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import pg from "pg";
import { assertSupabaseEnv } from "../../lib/env-guard.ts";
import { loadEnvFile } from "../lib/env-file.mjs";
import { scrub } from "../lib/scrub.mjs";

const values = loadEnvFile();
assertSupabaseEnv(process.env, { requireDbUrl: true });

const dir = fileURLToPath(new URL("../../supabase/migrations/", import.meta.url));
const files = readdirSync(dir).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();

// Supabase poolers require TLS; the pooler certificate is not in Node's default CA store.
const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query("create schema if not exists private");
  await client.query(
    "create table if not exists private.schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const { rows } = await client.query("select name from private.schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip    ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(dir, file), "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into private.schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`applied ${file}`);
    } catch (err) {
      await client.query("rollback");
      throw new Error(`${file}: ${err.message}`);
    }
  }
  console.log("migrations: done");
} catch (err) {
  console.error(`migrations: FAIL ${scrub(String(err.message ?? err), values)}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
