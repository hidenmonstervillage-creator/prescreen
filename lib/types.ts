// Shared shapes for trials, generated criteria and questions, and mappings.

export type Section = "inclusion" | "exclusion";

/** One criterion from the trial's criteria text. `quote` is verbatim from that text. */
export type Criterion = {
  id: string; // i1, i2 ... for inclusion, e1, e2 ... for exclusion, in text order
  section: Section;
  quote: string;
  /** Verbatim line that introduces a numbered sub-list this item belongs to, else null. */
  parent_quote: string | null;
  askable: boolean;
  not_askable_reason: string | null;
};

export type QuestionType = "yes_no" | "choice" | "number" | "free_text";

/** Inclusive numeric range; null means open on that side. */
export type NumberRange = { min: number | null; max: number | null };

/**
 * How one question's answer bears on one criterion it serves.
 * "confirm" means the answer shows the criterion's statement is true for the person,
 * "deny" that it is false. Code turns that into met or not met per section; for an
 * exclusion criterion a confirming answer gives not met. The model never decides that.
 */
export type QuestionRule = {
  criterion_id: string;
  confirm_answers: string[];
  deny_answers: string[];
  confirm_range: NumberRange | null;
  deny_range: NumberRange | null;
};

export type Question = {
  id: string; // q1, q2 ...
  text: string;
  type: QuestionType;
  options: string[] | null; // choice only
  criterion_ids: string[];
  rules: QuestionRule[];
};

/** The four states, and only these (CLAUDE.md rule 2). */
export const STATES = ["met", "not_met", "not_found", "needs_clinician"] as const;
export type State = (typeof STATES)[number];

/** Answers as submitted, keyed by question id. yes_no is "yes" | "no" | "unsure". */
export type Answers = Record<string, string | number | null | undefined>;

export type MappingRow = {
  criterion_id: string;
  state: State;
  quoted_criterion: string;
  quoted_answer: string | null;
  question_id: string | null;
};

export type TokenUsage = { calls: number; prompt_tokens: number; completion_tokens: number };
