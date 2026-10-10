// Maps one submission's answers onto the trial's criteria, criterion by criterion.
// Deterministic first: yes_no, choice and number answers are mapped in code from the
// question's rules. Only free_text answers go to the model, one call per criterion,
// and its quote must be a verbatim substring of the answer. The exclusion flip is
// always done here in code, never by the model.
import { openaiJson, addUsage, emptyUsage, type LlmJson } from "./openai";
import { normalizeWs } from "./text";
import type { Answers, Criterion, MappingRow, Question, QuestionRule, Section, State, TokenUsage } from "./types";

/** What an answer shows about a criterion's text, before the section is taken into account. */
export type Determination = "confirms" | "denies" | "unsettled";

export const YES_NO_ANSWERS = ["yes", "no", "unsure"] as const;

/** The inclusion or exclusion flip. Unsettled is always not found. */
export function stateFor(section: Section, d: Determination): State {
  if (d === "unsettled") return "not_found";
  if (section === "inclusion") return d === "confirms" ? "met" : "not_met";
  return d === "confirms" ? "not_met" : "met";
}

function isAnswered(v: Answers[string]): v is string | number {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

function inRange(n: number, r: { min: number | null; max: number | null } | null): boolean {
  if (!r || (r.min === null && r.max === null)) return false;
  return (r.min === null || n >= r.min) && (r.max === null || n <= r.max);
}

/** Deterministic evaluation of one non free_text answer against one rule. */
export function evaluateRule(q: Question, rule: QuestionRule, answer: Answers[string]): Determination {
  if (!isAnswered(answer)) return "unsettled";
  if (q.type === "yes_no" || q.type === "choice") {
    const a = String(answer);
    if (rule.confirm_answers.includes(a)) return "confirms";
    if (rule.deny_answers.includes(a)) return "denies";
    return "unsettled";
  }
  if (q.type === "number") {
    const n = typeof answer === "number" ? answer : Number(String(answer).trim());
    if (!Number.isFinite(n)) return "unsettled";
    if (inRange(n, rule.confirm_range)) return "confirms";
    if (inRange(n, rule.deny_range)) return "denies";
    return "unsettled";
  }
  return "unsettled";
}

export type FreeTextJob = { criterion: Criterion; question: Question; answer: string };

/**
 * Every row that code can decide, plus the free_text jobs for the model.
 * A criterion served by several questions needs every one of them settled and in
 * agreement; a disagreement goes to a clinician, anything missing is not found.
 */
export function mapDeterministic(
  criteria: Criterion[],
  questions: Question[],
  answers: Answers,
): { rows: MappingRow[]; jobs: FreeTextJob[] } {
  const rows: MappingRow[] = [];
  const jobs: FreeTextJob[] = [];
  for (const c of criteria) {
    const base = { criterion_id: c.id, quoted_criterion: quotedCriterion(c) };
    if (!c.askable) {
      rows.push({ ...base, state: "needs_clinician", quoted_answer: null, question_id: null });
      continue;
    }
    const serving = questions.filter((q) => q.criterion_ids.includes(c.id));
    if (serving.length === 0) {
      rows.push({ ...base, state: "not_found", quoted_answer: null, question_id: null });
      continue;
    }
    if (serving.length === 1 && serving[0].type === "free_text") {
      const q = serving[0];
      const a = answers[q.id];
      if (isAnswered(a)) jobs.push({ criterion: c, question: q, answer: String(a) });
      else rows.push({ ...base, state: "not_found", quoted_answer: null, question_id: q.id });
      continue;
    }
    const results = serving.map((q) => {
      const rule = q.rules.find((r) => r.criterion_id === c.id);
      const a = answers[q.id];
      const d: Determination = q.type === "free_text" || !rule ? "unsettled" : evaluateRule(q, rule, a);
      return { q, d, quote: isAnswered(a) ? String(a) : null };
    });
    const quoted = results
      .filter((r) => r.quote !== null)
      .map((r) => (serving.length > 1 ? `${r.q.id}: ${r.quote}` : (r.quote as string)))
      .join("; ");
    const questionId = serving.length === 1 ? serving[0].id : null;
    const ds = new Set(results.map((r) => r.d));
    let state: State;
    if (ds.has("confirms") && ds.has("denies")) state = "needs_clinician";
    else if (ds.has("unsettled")) state = "not_found";
    else state = stateFor(c.section, ds.has("confirms") ? "confirms" : "denies");
    rows.push({ ...base, state, quoted_answer: quoted || null, question_id: questionId });
  }
  return { rows, jobs };
}

/** The criterion text exactly as quoted, with its introducing line when it is a sub-item. */
export function quotedCriterion(c: Criterion): string {
  return c.parent_quote ? `${c.parent_quote} ${c.quote}` : c.quote;
}

// ---------------------------------------------------------------------------
// free_text: one model call per criterion

const FREE_TEXT_SYSTEM = `You read one answer that a person wrote about themselves, and one statement taken from a clinical trial's criteria list. Decide what the answer shows about the statement for this person.

Rules:
1. Use only what the answer says. Do not guess, assume or fill gaps.
2. "state" is "shows_true" when the answer shows that everything in the statement is true for the person, "shows_false" when the answer shows that the statement is false for the person, and "not_stated" in every other case.
3. "quoted_answer" is the exact words from the answer that show it, copied character for character. Use an empty string when "state" is "not_stated".`;

const FREE_TEXT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["state", "quoted_answer"],
  properties: {
    state: { type: "string", enum: ["shows_true", "shows_false", "not_stated"] },
    quoted_answer: { type: "string" },
  },
} as const;

type FreeTextOut = { state: "shows_true" | "shows_false" | "not_stated"; quoted_answer: string };

export async function mapFreeText(job: FreeTextJob, llm: LlmJson, usage: TokenUsage): Promise<MappingRow> {
  const base = {
    criterion_id: job.criterion.id,
    quoted_criterion: quotedCriterion(job.criterion),
    question_id: job.question.id,
  };
  const res = await llm<FreeTextOut>({
    label: `free_text ${job.criterion.id}`,
    messages: [
      { role: "system", content: FREE_TEXT_SYSTEM },
      {
        role: "user",
        content: `Statement:\n<<<\n${quotedCriterion(job.criterion)}\n>>>\n\nQuestion the person answered:\n<<<\n${job.question.text}\n>>>\n\nTheir answer:\n<<<\n${job.answer}\n>>>`,
      },
    ],
    schemaName: "free_text_reading",
    schema: FREE_TEXT_SCHEMA,
    maxTokens: 400,
  });
  addUsage(usage, res.usage);
  const quote = normalizeWs(res.data.quoted_answer ?? "");
  const verbatim = quote.length > 0 && normalizeWs(job.answer).includes(quote);
  if (res.data.state === "not_stated" || !verbatim) {
    return { ...base, state: "not_found", quoted_answer: job.answer };
  }
  const d: Determination = res.data.state === "shows_true" ? "confirms" : "denies";
  return { ...base, state: stateFor(job.criterion.section, d), quoted_answer: quote };
}

/** Full mapping for one submission, rows in criteria order. */
export async function mapSubmission(
  criteria: Criterion[],
  questions: Question[],
  answers: Answers,
  llm: LlmJson = openaiJson,
): Promise<{ rows: MappingRow[]; usage: TokenUsage }> {
  const usage = emptyUsage();
  const { rows, jobs } = mapDeterministic(criteria, questions, answers);
  const free = await Promise.all(jobs.map((j) => mapFreeText(j, llm, usage)));
  const byId = new Map([...rows, ...free].map((r) => [r.criterion_id, r]));
  return { rows: criteria.map((c) => byId.get(c.id)!), usage };
}
