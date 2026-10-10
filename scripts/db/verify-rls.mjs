// npm run db:verify-rls: prove with the anon key that RLS and grants hold.
// anon: SELECT on every table refused, INSERT into finder_rewrites and submit_attempts refused, INSERT into submissions refused for an unpublished
// or unknown trial, refused without consent, refused with the coordinator's columns, and allowed for a published one with
// consent; UPDATE and DELETE refused.
// Uses a temporary fictional trial row (service role) and deletes it afterwards.
// Prints check names and pass or fail only, never a value.
import { createClient } from "@supabase/supabase-js";
import { assertSupabaseEnv } from "../../lib/env-guard.ts";
import { loadEnvFile } from "../lib/env-file.mjs";
import { scrub } from "../lib/scrub.mjs";

const values = loadEnvFile();
assertSupabaseEnv(process.env, { requireServiceKey: true });
if (!process.env.SUPABASE_ANON_KEY) throw new Error("SUPABASE_ANON_KEY is not set");

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_ANON_KEY, opts);
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, opts);

const results = [];
function record(name, pass, detail = "") {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${scrub(detail, values)})` : ""}`);
}
const refused = (error) => Boolean(error);
const describe = (error) => (error ? `${error.code ?? ""} ${error.message ?? ""}`.trim() : "no error");

for (const table of ["trials", "mappings", "submissions", "login_attempts", "finder_rewrites", "submit_attempts"]) {
  const { data, error } = await anon.from(table).select("*").limit(1);
  record(`anon SELECT ${table} is refused`, refused(error) && !data, describe(error));
}

const unknownTrial = "00000000-0000-4000-8000-000000000000";
{
  const { error } = await anon.from("submissions").insert({ trial_id: unknownTrial, answers: {}, contact: "rls check" });
  record("anon INSERT submissions for an unknown trial is refused", refused(error), describe(error));
}
{
  const { error } = await anon.from("trials").insert({ nct_id: "NCT00000001", title: "x", raw_eligibility: "x" });
  record("anon INSERT trials is refused", refused(error), describe(error));
}
{
  const { error } = await anon.from("mappings").insert({
    submission_id: unknownTrial, criterion_id: "i1", state: "met", quoted_criterion: "x",
  });
  record("anon INSERT mappings is refused", refused(error), describe(error));
}
{
  const { error } = await anon.from("finder_rewrites").insert({ nct_id: "NCT00000001", lines: [] });
  record("anon INSERT finder_rewrites is refused", refused(error), describe(error));
}
{
  const { error } = await anon.from("submit_attempts").insert({ ip_hash: "rls check", trial_id: unknownTrial });
  record("anon INSERT submit_attempts is refused", refused(error), describe(error));
}
{
  const { error } = await anon.rpc("trial_is_published", { t: unknownTrial });
  record("policy helper is not callable through the Data API", refused(error), describe(error));
}

// Temporary fictional trial, published, so the one allowed anon path can be exercised.
const tempNct = "NCT00000000";
await service.from("trials").delete().eq("nct_id", tempNct);
const { data: temp, error: tempErr } = await service
  .from("trials")
  .insert({
    nct_id: tempNct,
    title: "Temporary RLS check trial (fictional)",
    raw_eligibility: "Inclusion Criteria:\n\n* Fictional criterion for an access check",
    slug: "rls-check-temp",
    published_at: new Date().toISOString(),
  })
  .select("id")
  .single();
record("service role can INSERT and SELECT trials", !tempErr && Boolean(temp?.id), describe(tempErr));

if (temp?.id) {
  const { data: unpub, error: unpubErr } = await service
    .from("trials")
    .insert({ nct_id: "NCT00000002", title: "Temporary unpublished (fictional)", raw_eligibility: "x" })
    .select("id")
    .single();
  if (!unpubErr && unpub?.id) {
    const { error } = await anon.from("submissions").insert({ trial_id: unpub.id, answers: {}, contact: "rls check" });
    record("anon INSERT submissions for an unpublished trial is refused", refused(error), describe(error));
    await service.from("trials").delete().eq("id", unpub.id);
  } else {
    record("set up unpublished temporary trial", false, describe(unpubErr));
  }

  {
    const { error } = await anon.from("submissions").insert({ trial_id: temp.id, answers: {}, contact: "rls check" });
    record("anon INSERT submissions without consent is refused", refused(error), describe(error));
  }
  {
    const { error } = await anon.from("submissions").insert({
      trial_id: temp.id, answers: {}, contact: "rls check", consent_given: true, consent_at: new Date().toISOString(),
      confirmed_by_coordinator: true, confirmed_at: new Date().toISOString(),
    });
    record("anon INSERT submissions with the coordinator's columns is refused", refused(error), describe(error));
  }

  const { error: insErr } = await anon.from("submissions").insert({
    trial_id: temp.id, answers: { q1: "yes" }, contact: "Fictional Tester, +359 00 000 0000",
    consent_given: true, consent_at: new Date().toISOString(),
  });
  record("anon INSERT submissions for a published trial, with consent, is allowed", !insErr, describe(insErr));

  const { error: updErr, count: updCount } = await anon
    .from("submissions")
    .update({ contact: "changed" }, { count: "exact" })
    .eq("trial_id", temp.id);
  record("anon UPDATE submissions is refused", refused(updErr) || updCount === 0, describe(updErr));

  const { error: delErr, count: delCount } = await anon
    .from("submissions")
    .delete({ count: "exact" })
    .eq("trial_id", temp.id);
  record("anon DELETE submissions is refused", refused(delErr) || delCount === 0, describe(delErr));

  const { count: kept } = await service
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("trial_id", temp.id)
    .eq("contact", "Fictional Tester, +359 00 000 0000");
  record("the anon-inserted row is intact (seen with the service role)", kept === 1, `count ${kept}`);

  const { error: cleanErr } = await service.from("trials").delete().eq("id", temp.id);
  const { count: left } = await service
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("trial_id", temp.id);
  record("temporary rows cleaned up (cascade)", !cleanErr && left === 0, describe(cleanErr));
}

const failed = results.filter((r) => !r).length;
console.log(`\nRLS checks: ${results.length - failed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
