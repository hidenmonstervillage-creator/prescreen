// Single source of the wording rules (CLAUDE.md rule 3 and rule 5).
// This file and CLAUDE.md are the only files allowed to spell out the banned words.
// tests/ui.wording.test.ts scans the repo with these patterns; lib/generate.ts uses
// them to reject generated text.

/** The one allowed sentence that uses the word "eligibility". Inbox footer only. */
export const FOOTER_TEXT =
  "A criteria map, not an eligibility decision. Every line quotes its source.";

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

// Built from code points so this file contains no literal dash or escape sequence.
const EM_DASH = String.fromCharCode(0x2014);
const EM_DASH_PATTERNS = [EM_DASH, "&" + "mdash;", "\\" + "u2014"];

/** Removes the allowed footer sentence so it is not counted as a verdict word. */
export function stripAllowed(text: string): string {
  return text.split(FOOTER_TEXT).join(" ");
}

/** First banned verdict word in `text`, or null. The footer sentence is allowed. */
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
