// The summary sentence under a criteria map and in the lead pack. Computed in code from the state
// counts, never by the model: counts and criterion ids only, no percentage and no verdict.
import { countStates } from "./states";
import { referralReady } from "./referral";
import type { MappingRow } from "./types";

const criteria = (n: number) => (n === 1 ? "criterion" : "criteria");

/**
 * "Referral-ready. 12 of 19 patient-answerable criteria met, 0 contradicted, 7 to confirm at the trial site.
 * 15 criteria are for the research team." or "Not referral-ready: 1 criterion contradicted (e6). 11 met,
 * 7 to confirm. 15 criteria are for the research team." Null when the submission has no map yet.
 * Patient-answerable is met + not met + not found; contradicted is not met; to confirm is not found;
 * for the research team is needs a clinician.
 */
export function summaryText(rows: Pick<MappingRow, "criterion_id" | "state">[]): string | null {
  if (!rows.length) return null;
  const c = countStates(rows);
  const answerable = c.met + c.not_met + c.not_found;
  const team = `${c.needs_clinician} ${c.needs_clinician === 1 ? "criterion is" : "criteria are"} for the research team.`;
  if (referralReady(c)) {
    return `Referral-ready. ${c.met} of ${answerable} patient-answerable ${criteria(answerable)} met, ${c.not_met} contradicted, ${c.not_found} to confirm at the trial site. ${team}`;
  }
  const ids = rows.filter((r) => r.state === "not_met").map((r) => r.criterion_id);
  return `Not referral-ready: ${c.not_met} ${criteria(c.not_met)} contradicted (${ids.join(", ")}). ${c.met} met, ${c.not_found} to confirm. ${team}`;
}
