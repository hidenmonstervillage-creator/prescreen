// The referral-ready flag and the lead pack selection. Computed in code from the state
// counts, never stored and never a verdict: the row shows the four counts next to it.
import { STATES, type State } from "./types";

/**
 * referral_ready = (not_met == 0), on a map that exists. Not found and needs a clinician are
 * counted and shown; they do not block the flag. A submission with no map yet has no counts
 * to read, so it is not flagged.
 */
export function referralReady(counts: Record<State, number>): boolean {
  const total = STATES.reduce((n, s) => n + counts[s], 0);
  return total > 0 && counts.not_met === 0;
}

export type PackFlags = {
  referral_ready: boolean;
  confirmed_by_coordinator: boolean;
  consent_given: boolean;
};

/**
 * A submission goes into a lead pack only when it is referral-ready, confirmed by the
 * coordinator, and has consent recorded: the pack shares contact details with the CRO.
 */
export function packable(s: PackFlags): boolean {
  return s.referral_ready && s.confirmed_by_coordinator && s.consent_given;
}
