// Labels for the four criterion states (CLAUDE.md rule 2). components/StateCell.tsx
// renders a single state; countsLine is the summary line above the matrix.
import { STATES, type MappingRow, type State } from "./types";

export const STATE_LABEL: Record<State, string> = {
  met: "met",
  not_met: "not met",
  not_found: "not found",
  needs_clinician: "needs a clinician",
};

export function countStates(rows: Pick<MappingRow, "state">[]): Record<State, number> {
  const counts = Object.fromEntries(STATES.map((s) => [s, 0])) as Record<State, number>;
  for (const r of rows) counts[r.state] += 1;
  return counts;
}

/** "N met · M not met · K not found · J need a clinician" ("1 needs a clinician" for one), from counts already taken. */
export function countsText(c: Record<State, number>): string {
  const clinician = c.needs_clinician === 1 ? "needs a clinician" : "need a clinician";
  return `${c.met} met · ${c.not_met} not met · ${c.not_found} not found · ${c.needs_clinician} ${clinician}`;
}

/** "N met · M not met · K not found · J need a clinician" */
export function countsLine(rows: Pick<MappingRow, "state">[]): string {
  return countsText(countStates(rows));
}
