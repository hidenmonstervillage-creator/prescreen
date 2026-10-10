// Runs once when a server instance starts. A wrong or refused Supabase project
// stops the instance before it serves anything (CLAUDE.md rule 6).
export async function register() {
  const { assertSupabaseEnv } = await import("./lib/env-guard");
  assertSupabaseEnv(process.env, { requireServiceKey: true });
  if (!process.env.SITE_PASSCODE) throw new Error("env guard refused to start: SITE_PASSCODE is not set");
}
