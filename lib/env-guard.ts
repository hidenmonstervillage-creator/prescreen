// Pins this app to one Supabase project (CLAUDE.md rule 6).
// Runs at server start (instrumentation.ts), before every service client is built
// (lib/supabase.ts), and from scripts (npm run env:check, npm run db:migrate).
// Messages name variables only, never values.
// Plain erasable TypeScript so Node can run it directly from scripts/*.mjs.

/** Projects this app must never talk to, whatever EXPECTED_SUPABASE_REF says. */
export const REFUSED_REFS: readonly string[] = ["iljgvelfhpdcwhqzxbyf", "xotegfqumptgxqywpzqo"];

const REF_RE = /^[a-z]{20}$/;

export type EnvLike = Record<string, string | undefined>;

export type GuardOptions = {
  /** Also require SUPABASE_DB_URL to name the expected project (migrations). */
  requireDbUrl?: boolean;
  /** Also require SUPABASE_SERVICE_ROLE_KEY to be present. */
  requireServiceKey?: boolean;
};

/** Project ref from https://<ref>.supabase.co, or null when the URL has another shape. */
export function refFromSupabaseUrl(url: string): string | null {
  const m = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/.exec(url.trim());
  return m ? m[1] : null;
}

/** Decoded payload of a legacy Supabase JWT key, or null for other key formats. */
function jwtPayload(key: string): Record<string, unknown> | null {
  const parts = key.trim().split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Every problem with the Supabase environment. Empty means the guard passes. */
export function checkSupabaseEnv(env: EnvLike, opts: GuardOptions = {}): string[] {
  const errors: string[] = [];
  const expected = env.EXPECTED_SUPABASE_REF?.trim() ?? "";
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";

  if (!expected) errors.push("EXPECTED_SUPABASE_REF is not set");
  else if (!REF_RE.test(expected)) errors.push("EXPECTED_SUPABASE_REF is not a 20 letter project ref");
  else if (REFUSED_REFS.includes(expected)) errors.push("EXPECTED_SUPABASE_REF names a refused project");

  if (!url) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL is not set");
  } else {
    const ref = refFromSupabaseUrl(url);
    if (!ref) errors.push("NEXT_PUBLIC_SUPABASE_URL is not of the form https://<ref>.supabase.co");
    else if (REFUSED_REFS.includes(ref)) errors.push("NEXT_PUBLIC_SUPABASE_URL points at a refused project");
    else if (expected && ref !== expected) errors.push("NEXT_PUBLIC_SUPABASE_URL does not match EXPECTED_SUPABASE_REF");
  }

  // No Supabase-bearing value may mention a refused project, in plain text or in a JWT ref claim.
  for (const name of ["SUPABASE_DB_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY"]) {
    const value = env[name] ?? "";
    const claimRef = jwtPayload(value)?.ref;
    const refused =
      REFUSED_REFS.some((r) => value.includes(r)) || (typeof claimRef === "string" && REFUSED_REFS.includes(claimRef));
    if (refused) errors.push(`${name} points at a refused project`);
  }

  const db = env.SUPABASE_DB_URL?.trim() ?? "";
  if (opts.requireDbUrl && !db) errors.push("SUPABASE_DB_URL is not set");
  if (db && expected && !db.includes(expected)) errors.push("SUPABASE_DB_URL does not name EXPECTED_SUPABASE_REF");

  const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (opts.requireServiceKey && !service) errors.push("SUPABASE_SERVICE_ROLE_KEY is not set");
  if (service) {
    if (service.startsWith("sb_publishable_")) {
      errors.push("SUPABASE_SERVICE_ROLE_KEY holds a publishable key, not the service_role or secret key");
    }
    const claims = jwtPayload(service);
    if (claims) {
      if (claims.role !== "service_role") errors.push("SUPABASE_SERVICE_ROLE_KEY is not a service_role key");
      if (expected && claims.ref !== expected) errors.push("SUPABASE_SERVICE_ROLE_KEY belongs to another project");
    }
  }

  const anon = env.SUPABASE_ANON_KEY?.trim() ?? "";
  if (anon) {
    if (anon.startsWith("sb_secret_")) errors.push("SUPABASE_ANON_KEY holds a secret key, not the anon or publishable key");
    const claims = jwtPayload(anon);
    if (claims) {
      if (claims.role !== "anon") errors.push("SUPABASE_ANON_KEY is not an anon key");
      if (expected && claims.ref !== expected) errors.push("SUPABASE_ANON_KEY belongs to another project");
    }
  }

  return errors;
}

/** Throws, naming every problem, when the Supabase environment is not the pinned project. */
export function assertSupabaseEnv(env: EnvLike, opts: GuardOptions = {}): void {
  const errors = checkSupabaseEnv(env, opts);
  if (errors.length > 0) {
    throw new Error(`env guard refused to start: ${errors.join("; ")}`);
  }
}
