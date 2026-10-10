// Consent on the public pre-screen page. The box is required on the page, the server
// refuses a submission without it (lib/trials.ts submitAnswers), and so does the anon
// INSERT policy (supabase/migrations/0003).

/** Shown side by side above the submit button. Exact wording, English and Bulgarian. */
export const CONSENT_TEXT = {
  en: "I agree that my answers and contact details may be shared with the research organisation running this trial so that they can contact me. I can withdraw at any time by contacting the hospital.",
  bg: "Съгласен/на съм отговорите ми и данните ми за контакт да бъдат споделени с изследователската организация, която провежда това проучване, за да се свърже с мен. Мога да оттегля съгласието си по всяко време, като се свържа с болницата.",
} as const;

export const CONSENT_REQUIRED_MESSAGE = "Tick the consent box to send your answers.";

/** Only a literal true counts as consent: no strings, no numbers, no defaults. */
export function consentGiven(body: unknown): boolean {
  return Boolean(body && typeof body === "object" && (body as { consent?: unknown }).consent === true);
}

export class ConsentRequiredError extends Error {
  constructor() {
    super(CONSENT_REQUIRED_MESSAGE);
    this.name = "ConsentRequiredError";
  }
}
