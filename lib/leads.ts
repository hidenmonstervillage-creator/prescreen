// Loads a lead pack: the referral-ready submissions of one trial that a coordinator confirmed
// and that have consent recorded. Service role, server only. lib/pack.ts draws the PDF.
import "server-only";
import { db } from "./supabase";
import { getTrialById, inCriteriaOrder } from "./trials";
import { countStates } from "./states";
import { packable, referralReady } from "./referral";
import { hospitalName } from "./hospital";
import type { LeadPack, PackPatient } from "./pack";
import type { MappingRow } from "./types";

const UUID = /^[0-9a-f-]{36}$/;

type Raw = {
  id: string;
  created_at: string;
  contact: string;
  consent_given: boolean;
  consent_at: string | null;
  confirmed_by_coordinator: boolean;
  confirmed_at: string | null;
  mappings: MappingRow[] | null;
};

/** Trials that have at least one patient for a pack, with how many. */
export async function packableTrials(): Promise<{ id: string; nct_id: string; title: string; patients: number }[]> {
  const { data, error } = await db()
    .from("submissions")
    .select("trial_id, mappings(state), trial:trials(id, nct_id, title)")
    .eq("consent_given", true)
    .eq("confirmed_by_coordinator", true);
  if (error) throw new Error(`lead pack load failed: ${error.message}`);
  const byTrial = new Map<string, { id: string; nct_id: string; title: string; patients: number }>();
  type Row = { trial_id: string; mappings: Pick<MappingRow, "state">[] | null; trial: { id: string; nct_id: string; title: string } | null };
  for (const s of (data ?? []) as unknown as Row[]) {
    if (!s.trial || !referralReady(countStates(s.mappings ?? []))) continue;
    const t = byTrial.get(s.trial_id) ?? { ...s.trial, patients: 0 };
    t.patients += 1;
    byTrial.set(s.trial_id, t);
  }
  return [...byTrial.values()];
}

/**
 * The pack for one trial, oldest submission first. With `ids`, exactly those submissions:
 * if any of them is no longer packable the result says so, so a download never differs
 * from the preview it came from.
 */
export async function loadLeadPack(
  trialId: string,
  ids?: string[],
): Promise<{ pack: LeadPack } | { missing: "trial" | "patients" | "changed" }> {
  if (!UUID.test(trialId) || (ids && !ids.every((id) => UUID.test(id)))) return { missing: "trial" };
  const trial = await getTrialById(trialId);
  if (!trial) return { missing: "trial" };
  const { data, error } = await db()
    .from("submissions")
    .select(
      "id, created_at, contact, consent_given, consent_at, confirmed_by_coordinator, confirmed_at, mappings(criterion_id, state, quoted_criterion, quoted_answer, question_id)",
    )
    .eq("trial_id", trialId)
    .eq("consent_given", true)
    .eq("confirmed_by_coordinator", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`lead pack load failed: ${error.message}`);

  const patients: PackPatient[] = [];
  for (const s of (data ?? []) as Raw[]) {
    const rows = inCriteriaOrder(s.mappings ?? [], trial.criteria);
    if (!packable({ ...s, referral_ready: referralReady(countStates(rows)) })) continue;
    if (ids && !ids.includes(s.id)) continue;
    patients.push({
      submission_id: s.id,
      contact: s.contact,
      submitted_at: s.created_at,
      consent_at: s.consent_at as string,
      confirmed_at: s.confirmed_at as string,
      rows,
    });
  }
  if (ids && (patients.length !== new Set(ids).size || patients.length !== ids.length)) return { missing: "changed" };
  if (!patients.length) return { missing: "patients" };
  return {
    pack: {
      trial: { id: trial.id, nct_id: trial.nct_id, title: trial.title, criteria: trial.criteria, questions: trial.questions },
      hospital: hospitalName(),
      created_at: new Date().toISOString(),
      patients,
    },
  };
}
