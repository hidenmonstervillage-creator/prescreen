// Database side of the doctor-side search (lib/finder.ts). Service role, server only.
// finder_rewrites caches the plain-word lines per NCT ID, so a repeated search makes no
// model calls; the trials table says which studies are published here.
import "server-only";
import { db } from "./supabase";
import { searchStudies } from "./ctgov";
import { openaiJson } from "./openai";
import type { CachedRewrite, FinderDeps, PlainLine, PlatformRow, RewriteReport } from "./finder";

export async function platformRows(nctIds: string[]): Promise<PlatformRow[]> {
  if (!nctIds.length) return [];
  const { data, error } = await db().from("trials").select("nct_id, slug, published_at").in("nct_id", nctIds);
  if (error) throw new Error(`trial lookup failed: ${error.message}`);
  return (data ?? []) as PlatformRow[];
}

export async function readRewrite(nctId: string): Promise<CachedRewrite | null> {
  const { data, error } = await db().from("finder_rewrites").select("lines, report").eq("nct_id", nctId).maybeSingle();
  if (error) throw new Error(`finder_rewrites read failed: ${error.message}`);
  if (!data) return null;
  const version = (data.report as Partial<RewriteReport> | null)?.prompt_version;
  return { lines: (data.lines ?? []) as PlainLine[], promptVersion: typeof version === "number" ? version : null };
}

export async function saveRewrite(nctId: string, lines: PlainLine[], report: RewriteReport): Promise<void> {
  const { error } = await db()
    .from("finder_rewrites")
    .upsert({ nct_id: nctId, lines, report, created_at: new Date().toISOString() }, { onConflict: "nct_id" });
  if (error) throw new Error(`finder_rewrites write failed: ${error.message}`);
}

export const finderDeps: FinderDeps = {
  search: (params) => searchStudies(params),
  platformRows,
  readRewrite,
  saveRewrite,
  llm: openaiJson,
};
