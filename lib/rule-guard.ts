// Guards on the model's questions, applied in code before anything is stored (lib/generate.ts).
//
// Polarity. A yes or no question asks affirmatively, and only one shape of rule is accepted:
// "yes" may only confirm the criterion's text and "no" may only deny it. Read with the section, that
// is: inclusion, yes gives met and no gives not met; exclusion, yes gives not met and no gives met.
// An answer may also settle nothing (it then maps to not found); it may never settle the other way.
// A choice question whose every option starts with "Yes" or "No" is held to the same rule.
//
// Time windows. A criterion that names a time window ("within 4 weeks before", "at least 2 weeks
// since", a washout period) and that the must-ask table does not ask is served only by a number
// question that asks for the number ("How many weeks ago ...") and whose rule compares it
// (confirm_range or deny_range). A yes or no question, or a
// choice, on a time window is rejected. A window measured in half-lives is never asked: a patient
// cannot know a half-life, so no number settles it (halfLifeGuard, before the model).
//
// Permissions ("may have received", "is allowed") are guarded earlier, in lib/must-ask.ts: never asked.
import type { Criterion, Question } from "./types";

/** A number question on a time window asks for the number: "How many weeks ago ...", "How long since ...", "When ...". */
export const ASKS_FOR_A_NUMBER_RE = /\b(?:how many|how long|how much time|when)\b/i;

/** Words that make a question's stem negative. */
export const NEGATIVE_STEM_RE = /\b(?:not|never|without|no longer|cannot)\b|\b\w+n['’]t\b/i;

const UNIT = "(?:hours?|days?|weeks?|months?|years?)";
const COUNT = "(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)";

/** "within 4 weeks", "84 days following", "at least 2 weeks since", "in the last 12 months", washout, half-lives. */
export const TIME_WINDOW_PATTERNS: readonly RegExp[] = [
  new RegExp(`\\bwithin\\s+(?:the\\s+)?(?:past\\s+|last\\s+|previous\\s+|preceding\\s+)?${COUNT}\\s*(?:\\(\\d+\\)\\s*)?${UNIT}\\b`, "i"),
  new RegExp(`\\b${COUNT}\\s*${UNIT}\\s*(?:\\([^)]*\\)\\s*)?(?:before|prior to|after|since|following|from)\\b`, "i"),
  new RegExp(`\\b(?:at least|less than|more than|fewer than)\\s+${COUNT}\\s*${UNIT}\\s+(?:since|before|prior|after|from|following|have elapsed|has elapsed)\\b`, "i"),
  new RegExp(`\\b(?:in|during)\\s+the\\s+(?:past|last|previous|preceding)\\s+(?:${COUNT}\\s*)?${UNIT}\\b`, "i"),
  /\bwash-?\s?out\b/i,
  /\bhalf-?\s?lives?\b/i,
];

export function criterionText(c: Pick<Criterion, "quote" | "parent_quote">): string {
  return c.parent_quote ? `${c.parent_quote} ${c.quote}` : c.quote;
}

export function isTimeWindow(c: Pick<Criterion, "quote" | "parent_quote">): boolean {
  const text = criterionText(c);
  return TIME_WINDOW_PATTERNS.some((re) => re.test(text));
}

/** The answers that mean yes and no for a yes or no question, or a choice whose options all start with Yes or No. */
export function yesNoAnswers(q: Pick<Question, "type" | "options">): { yes: string[]; no: string[] } | null {
  if (q.type === "yes_no") return { yes: ["yes"], no: ["no"] };
  const opts = q.options ?? [];
  if (q.type === "choice" && opts.length >= 2 && opts.every((o) => /^\s*(?:yes|no)\b/i.test(o))) {
    return { yes: opts.filter((o) => /^\s*yes\b/i.test(o)), no: opts.filter((o) => /^\s*no\b/i.test(o)) };
  }
  return null;
}

export type Guard = "permission" | "time_window" | "polarity";

/** A rule the guards refused, before its one re-ask. */
export type RuleRejection = { question_id: string; criterion_id: string; guard: Exclude<Guard, "permission">; problem: string };

/** A criterion sent to the research team: no patient answer may give it met or not met. */
export type ResearchTeamItem = { criterion_id: string; guard: Guard; reason: string };

export const RESEARCH_TEAM_REASON: Record<Guard, string> = {
  permission: "a permission, not a requirement",
  time_window: "a time window the research team checks",
  polarity: "the answer alone cannot settle it",
};

export const HALF_LIFE_REASON = "a time window that depends on a medicine's half-life";

const HALF_LIFE_RE = /\bhalf-?\s?li(?:fe|ves)\b/i;

/**
 * A time window measured in half-lives ("2 weeks or 5 half-lives, whichever is shorter") turns on a number
 * the patient cannot know: no day count settles it. Sent to the research team before the model sees it.
 */
export function halfLifeGuard(criteria: Criterion[]): { criteria: Criterion[]; sent: ResearchTeamItem[] } {
  const sent: ResearchTeamItem[] = [];
  const out = criteria.map((c) => {
    if (!c.askable || !HALF_LIFE_RE.test(criterionText(c))) return c;
    sent.push({ criterion_id: c.id, guard: "time_window", reason: HALF_LIFE_REASON });
    return { ...c, askable: false, not_askable_reason: HALF_LIFE_REASON };
  });
  return { criteria: out, sent };
}

/**
 * The line on the New trial screen: "N questions written, M criteria sent to the research team because
 * the answer alone cannot settle them." Null for a trial generated before the guards existed.
 */
export function guardSummaryText(report: { questions?: { kept: number }; research_team?: ResearchTeamItem[] }): string | null {
  if (!report.questions || !report.research_team) return null;
  const n = report.questions.kept;
  const m = report.research_team.length;
  return (
    `${n} ${n === 1 ? "question" : "questions"} written, ${m} ${m === 1 ? "criterion" : "criteria"} sent to the research team ` +
    `because the answer alone cannot settle ${m === 1 ? "it" : "them"}.`
  );
}

/** "R model rules refused and re-asked once: P passed the second time." Null when none was refused. */
export function rejectedRulesText(q: { rejected_rules?: RuleRejection[]; reasked_criteria?: { passed: boolean }[] } | undefined): string | null {
  const r = q?.rejected_rules?.length ?? 0;
  if (!r) return null;
  const asked = q?.reasked_criteria ?? [];
  const passed = asked.filter((a) => a.passed).length;
  return (
    `${r} model ${r === 1 ? "rule" : "rules"} refused by the polarity and time-window checks; ` +
    `${asked.length} ${asked.length === 1 ? "criterion" : "criteria"} re-asked once, ${passed} passed the second time.`
  );
}

/** Every rule of one model question the guards refuse, with the problem to put to the model. */
export function ruleRejections(q: Question, criteria: Criterion[]): RuleRejection[] {
  const byId = new Map(criteria.map((c) => [c.id, c]));
  const yn = yesNoAnswers(q);
  const negative = yn ? NEGATIVE_STEM_RE.exec(q.text) : null;
  const out: RuleRejection[] = [];
  for (const r of q.rules) {
    const c = byId.get(r.criterion_id);
    if (!c) continue;
    if (isTimeWindow(c) && (q.type !== "number" || !ASKS_FOR_A_NUMBER_RE.test(q.text))) {
      out.push({
        question_id: q.id,
        criterion_id: c.id,
        guard: "time_window",
        problem:
          q.type === "number"
            ? 'the question must ask for the number itself, for example "How many weeks ago did you last ...?", and the ranges compare it'
            : 'the criterion names a time window: use a "number" question that asks how many days, weeks or months ago, and set the ranges from the window',
      });
      continue;
    }
    if (!yn) continue;
    const problems: string[] = [];
    if (negative) problems.push(`ask it affirmatively: the question says "${negative[0]}"`);
    const yesDenies = r.deny_answers.some((a) => yn.yes.includes(a));
    const noConfirms = r.confirm_answers.some((a) => yn.no.includes(a));
    if (yesDenies || noConfirms) {
      problems.push('ask it affirmatively: "yes" may only show that the criterion\'s text is true, and "no" only that it is false');
    }
    if (problems.length) out.push({ question_id: q.id, criterion_id: c.id, guard: "polarity", problem: problems.join("; ") });
  }
  return out;
}
