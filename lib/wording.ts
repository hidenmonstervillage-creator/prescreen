// Single source of the wording rules (CLAUDE.md rule 3 and rule 5).
// This file and CLAUDE.md are the only files allowed to spell out the banned words.
// tests/ui.wording.test.ts scans the repo with these patterns; lib/generate.ts uses
// them to reject generated text.

/** The inbox footer: the first allowed use of the word "eligibility". */
export const FOOTER_TEXT =
  "A criteria map, not an eligibility decision. Every line quotes its source.";

/** The lead pack footer, on every page of the PDF and its preview: the second allowed use. */
export const PACK_FOOTER_TEXT = `${FOOTER_TEXT} The research organisation makes the eligibility decision.`;

/** Verdict and scoring words. Banned in UI text, generated output, copy, identifiers and logs. */
export const VERDICT_WORDS: readonly string[] = [
  "eligible",
  "ineligible",
  "eligibility",
  "qualify",
  "qualifies",
  "qualified",
  "qualifying",
  "likely",
  "unlikely",
  "likelihood",
  "score",
  "scores",
  "scored",
  "scoring",
  "probability",
  "probabilities",
  "probable",
];

const VERDICT_RE = new RegExp(`\\b(${VERDICT_WORDS.join("|")})\\b`, "i");

/**
 * A criterion that only gives permission, in the registry's own words: "are eligible for the study",
 * "remain eligible to continue". Kept here because only this file may spell the word; the permission
 * guard in lib/must-ask.ts uses it to send such a criterion to the research team, never to a question.
 */
export const PERMISSION_VERDICT_RE = /\b(?:is|are|be|remain|remains)\s+(?:also\s+)?eligible\b/i;

// Built from code points so this file contains no literal dash or escape sequence.
const EM_DASH = String.fromCharCode(0x2014);
const EM_DASH_PATTERNS = [EM_DASH, "&" + "mdash;", "\\" + "u2014"];

/** Removes the allowed footer sentences so they are not counted as verdict words. */
export function stripAllowed(text: string): string {
  return text.split(PACK_FOOTER_TEXT).join(" ").split(FOOTER_TEXT).join(" ");
}

/** First banned verdict word in `text`, or null. The footer sentences are allowed. */
export function findVerdictWord(text: string): string | null {
  const m = VERDICT_RE.exec(stripAllowed(text));
  return m ? m[1] : null;
}

/** True when `text` contains an em dash in literal, HTML entity or JS escape form. */
export function hasEmDash(text: string): boolean {
  return EM_DASH_PATTERNS.some((p) => text.includes(p));
}

/** Problems with a piece of generated or UI text, empty when clean. */
export function wordingProblems(text: string): string[] {
  const problems: string[] = [];
  const word = findVerdictWord(text);
  if (word) problems.push(`verdict word "${word}"`);
  if (hasEmDash(text)) problems.push("em dash");
  return problems;
}
