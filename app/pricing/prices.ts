// The prices on /pricing. Change them here: the page reads nothing else.

/** Sites: euros per active trial per month. */
export const SITE_PRICE_EUR = 149;

/** Sponsors: euros per trial per month, covering all of that trial's sites. */
export const SPONSOR_PRICE_EUR = 990;

/** Free period on a site's first trial, in days. */
export const FREE_TRIAL_DAYS = 30;

export function euros(amount: number): string {
  return `€${amount.toLocaleString("en-IE")}`;
}
