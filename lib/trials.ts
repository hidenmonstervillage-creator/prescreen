// Database access for trials, submissions and mappings. Service role, server only.
import "server-only";
import { randomInt } from "node:crypto";
import { db } from "./supabase";
import { fetchStudy, type CtgovLocation } from "./ctgov";
import { generateForTrial, type GenerationReport } from "./generate";
import { mapSubmission } from "./mapping";
import { countStates } from "./states";
import { packable, referralReady } from "./referral";
import { ConsentRequiredError } from "./consent";
import type { Answers, Criterion, MappingRow, Question, State } from "./types";

export type TrialSource = {
  overallStatus: string | null;
  conditions: string[];
  phases: string[];
  sponsor: string | null;
  sex: string | null;
  minimumAge: string | null;
  maximumAge: string | null;
  locations: CtgovLocation[];
};

export type Trial = {
  id: string;
  nct_id: string;
  title: string;
  raw_eligibility: string;
  criteria: Criterion[];
  questions: Question[];
  source: TrialSource;
  generation: (GenerationReport & { generated_at?: string }) | Record<string, never>;
  slug: string | null;
  published_at: string | null;
  created_at: string;
};

/** The fields the public page may see: no criteria, no generation report. */
export type PublicTrial = Pick<Trial, "id" | "nct_id" | "title" | "questions" | "slug">;

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "no row"}`);
}

export async function getTrialByNct(nctId: string): Promise<Trial | null> {
  const { data, error } = await db().from("trials").select("*").eq("nct_id", nctId).maybeSingle();
  if (error) fail("trial lookup failed", error);
  return (data as Trial) ?? null;
}

export async function getTrialById(id: string): Promise<Trial | null> {
  const { data, error } = await db().from("trials").select("*").eq("id", id).maybeSingle();
  if (error) fail("trial lookup failed", error);
  return (data as Trial) ?? null;
}

export async function getPublishedTrialBySlug(slug: string): Promise<PublicTrial | null> {
  if (!/^[a-z0-9-]{6,80}$/.test(slug)) return null;
  const { data, error } = await db()
    .from("trials")
    .select("id, nct_id, title, questions, slug")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) fail("trial lookup failed", error);
  return (data as PublicTrial) ?? null;
}

/**
 * Fetches the study, generates criteria and questions, and stores them.
 * An existing trial is returned as is (no spend) unless regenerate is set and it is not published.
 */
export async function createOrGetTrial(nctId: string, regenerate = false): Promise<{ trial: Trial; reused: boolean }> {
  const existing = await getTrialByNct(nctId);
  if (existing && existing.criteria.length && (!regenerate || existing.published_at)) {
    return { trial: existing, reused: true };
  }
  const study = await fetchStudy(nctId);
  if (!study.criteriaText.trim()) throw new Error("this study has no criteria text on ClinicalTrials.gov");
  const { criteria, questions, report } = await generateForTrial(study.criteriaText);
  const source: TrialSource = {
    overallStatus: study.overallStatus,
    conditions: study.conditions,
    phases: study.phases,
    sponsor: study.sponsor,
    sex: study.sex,
    minimumAge: study.minimumAge,
    maximumAge: study.maximumAge,
    locations: study.locations,
  };
  const row = {
    nct_id: study.nctId,
    title: study.title,
    raw_eligibility: study.criteriaText,
    criteria,
    questions,
    source,
    generation: { ...report, generated_at: new Date().toISOString() },
  };
  const { data, error } = await db().from("trials").upsert(row, { onConflict: "nct_id" }).select("*").single();
  if (error || !data) fail("trial save failed", error);
  return { trial: data as Trial, reused: false };
}

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** 8 random characters (about 41 bits), so public links cannot be guessed from the NCT ID. */
function slugSuffix(): string {
  return Array.from({ length: 8 }, () => SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)]).join("");
}

export async function publishTrial(id: string): Promise<Trial> {
  const trial = await getTrialById(id);
  if (!trial) throw new Error("trial not found");
  if (trial.slug && trial.published_at) return trial;
  if (!trial.questions.length) throw new Error("this trial has no questions to publish");
  const slug = `${trial.nct_id.toLowerCase()}-${slugSuffix()}`;
  const { data, error } = await db()
    .from("trials")
    .update({ slug, published_at: new Date().toISOString() })
    .eq("id", id)
    .is("published_at", null)
    .select("*")
    .single();
  if (error || !data) fail("publish failed", error);
  return data as Trial;
}

export async function listTrials(): Promise<Pick<Trial, "id" | "nct_id" | "title" | "slug" | "published_at" | "created_at">[]> {
  const { data, error } = await db()
    .from("trials")
    .select("id, nct_id, title, slug, published_at, created_at")
    .order("created_at", { ascending: false });
  if (error) fail("trial list failed", error);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Submissions

/** Consent and the coordinator's confirmation, as stored on a submission. */
export type SubmissionFlags = {
  consent_given: boolean;
  consent_at: string | null;
  confirmed_by_coordinator: boolean;
  confirmed_at: string | null;
};

export type InboxRow = SubmissionFlags & {
  id: string;
  created_at: string;
  contact: string;
  trial: { id: string; nct_id: string; title: string } | null;
  /** The four state counts of the map; all zero when there is no map yet. */
  counts: Record<State, number>;
  referral_ready: boolean;
  /** Referral-ready, confirmed and with consent: may go into a lead pack. */
  packable: boolean;
};

const FLAG_COLUMNS = "consent_given, consent_at, confirmed_by_coordinator, confirmed_at";

export async function listSubmissions(): Promise<InboxRow[]> {
  const { data, error } = await db()
    .from("submissions")
    .select(`id, created_at, contact, ${FLAG_COLUMNS}, trial:trials(id, nct_id, title), mappings(state)`)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) fail("inbox load failed", error);
  type Raw = Omit<InboxRow, "counts" | "referral_ready" | "packable"> & { mappings: Pick<MappingRow, "state">[] | null };
  return ((data ?? []) as unknown as Raw[]).map(({ mappings, ...s }) => {
    const counts = countStates(mappings ?? []);
    const ready = referralReady(counts);
    return { ...s, counts, referral_ready: ready, packable: packable({ ...s, referral_ready: ready }) };
  });
}

/** The inbox checkbox "Confirmed by coordinator". Returns null for an unknown submission. */
export async function setCoordinatorConfirmation(
  id: string,
  confirmed: boolean,
): Promise<Pick<SubmissionFlags, "confirmed_by_coordinator" | "confirmed_at"> | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data, error } = await db()
    .from("submissions")
    .update({ confirmed_by_coordinator: confirmed, confirmed_at: confirmed ? new Date().toISOString() : null })
    .eq("id", id)
    .select("confirmed_by_coordinator, confirmed_at")
    .maybeSingle();
  if (error) fail("confirmation save failed", error);
  return data ?? null;
}

export type SubmissionDetail = SubmissionFlags & {
  id: string;
  created_at: string;
  contact: string;
  answers: Answers;
  trial: Trial;
  rows: MappingRow[];
};

export async function getSubmissionDetail(id: string): Promise<SubmissionDetail | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data: sub, error } = await db()
    .from("submissions")
    .select(`id, created_at, contact, answers, trial_id, ${FLAG_COLUMNS}`)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("submission load failed", error);
  if (!sub) return null;
  const trial = await getTrialById(sub.trial_id);
  if (!trial) return null;
  const { data: maps, error: mErr } = await db()
    .from("mappings")
    .select("criterion_id, state, quoted_criterion, quoted_answer, question_id")
    .eq("submission_id", id);
  if (mErr) fail("mapping load failed", mErr);
  const rows = inCriteriaOrder((maps ?? []) as MappingRow[], trial.criteria);
  return {
    id: sub.id,
    created_at: sub.created_at,
    contact: sub.contact,
    answers: sub.answers ?? {},
    consent_given: sub.consent_given,
    consent_at: sub.consent_at,
    confirmed_by_coordinator: sub.confirmed_by_coordinator,
    confirmed_at: sub.confirmed_at,
    trial,
    rows,
  };
}

/** Map rows in the order of the trial's criteria. */
export function inCriteriaOrder(rows: MappingRow[], criteria: Criterion[]): MappingRow[] {
  const order = new Map(criteria.map((c, i) => [c.id, i]));
  return [...rows].sort((a, b) => (order.get(a.criterion_id) ?? 1e9) - (order.get(b.criterion_id) ?? 1e9));
}

async function writeMappings(submissionId: string, rows: MappingRow[]): Promise<void> {
  const { error: delErr } = await db().from("mappings").delete().eq("submission_id", submissionId);
  if (delErr) fail("mapping reset failed", delErr);
  const { error } = await db()
    .from("mappings")
    .insert(rows.map((r) => ({ ...r, submission_id: submissionId })));
  if (error) fail("mapping save failed", error);
}

/**
 * Stores the submission, then its map. A map failure leaves the submission for a rebuild.
 * Refused without consent: this is the one place a submission is stored, so no path skips it.
 */
export async function submitAnswers(
  trial: PublicTrial,
  answers: Answers,
  contact: string,
  consent: boolean,
): Promise<{ submissionId: string; mapped: boolean }> {
  if (consent !== true) throw new ConsentRequiredError();
  const { data, error } = await db()
    .from("submissions")
    .insert({ trial_id: trial.id, answers, contact, consent_given: true, consent_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !data) fail("submission save failed", error);
  try {
    await buildMap(data.id);
    return { submissionId: data.id, mapped: true };
  } catch (err) {
    console.error(`[submit] map not built for ${data.id}: ${(err as Error).message}`);
    return { submissionId: data.id, mapped: false };
  }
}

/** (Re)builds the map for one submission from the trial's stored criteria and questions. */
export async function buildMap(submissionId: string): Promise<MappingRow[]> {
  const { data: sub, error } = await db()
    .from("submissions")
    .select("id, answers, trial_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (error || !sub) fail("submission load failed", error);
  const trial = await getTrialById(sub.trial_id);
  if (!trial) throw new Error("trial not found");
  const { rows, usage } = await mapSubmission(trial.criteria, trial.questions, sub.answers ?? {});
  await writeMappings(submissionId, rows);
  console.log(`[map] ${submissionId}: ${rows.length} rows; ${usage.calls} model calls, ${usage.prompt_tokens} in, ${usage.completion_tokens} out`);
  return rows;
}
