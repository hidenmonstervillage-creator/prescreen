// The figures on /pricing. Change them here. [X], [Z], [N] and [Y] in the page copy are
// placeholders still to be set.

/** CRO trial plan: euros per trial per month. */
export const TRIAL_PLAN_EUR = 990;

/** Leads per trial that are free to the CRO. */
export const FREE_LEADS_PER_TRIAL = 10;

export function euros(amount: number): string {
  return `€${amount.toLocaleString("en-IE")}`;
}
