// Generation for one trial: (a) split the criteria text into quoted criteria,
// (b) write 8 to 12 plain-language questions that serve the askable ones.
// One model call each (gpt-4o, temperature 0, JSON), at most one re-ask each.
// Every check here is deterministic code; the model's output is never trusted as is.
import { MODEL, openaiJson, addUsage, emptyUsage, type ChatMessage, type LlmJson } from "./openai";
import { wordingProblems } from "./wording";
import type { Criterion, Question, QuestionRule, QuestionType, Section, TokenUsage } from "./types";
import { normalizeWs, visibleText } from "./text";

export { normalizeWs, visibleText };

// ---------------------------------------------------------------------------
// Text helpers

const BULLET_RE = /^\s*(?:[*\-•]|\d+[.)])\s+/;

/** Removes a leading bullet or list number the model may have copied. */
export function stripBullet(s: string): string {
  return s.replace(BULLET_RE, "");
}

/**
 * True when `quote` appears in `text` exactly, ignoring only whitespace differences and
 * markdown backslash escapes (which are markup, not text: "\<50%" reads "<50%").
 */
export function isVerbatim(quote: string, text: string): boolean {
  const q = visibleText(quote);
  return q.length > 0 && visibleText(text).includes(q);
}

/** Bullet and numbered lines under the inclusion and exclusion headings, in order. */
export function criteriaLines(text: string): { section: Section; line: string }[] {
  const out: { section: Section; line: string }[] = [];
  let section: Section | null = null;
  for (const raw of text.split(/\r?\n/)) {
    if (/^\s*\**\s*inclusion criteria/i.test(raw)) section = "inclusion";
    else if (/^\s*\**\s*exclusion criteria/i.test(raw)) section = "exclusion";
    else if (section && BULLET_RE.test(raw)) out.push({ section, line: visibleText(stripBullet(raw)) });
  }
  return out;
}

/** Offset in the visible text where the exclusion heading starts, or -1. */
function exclusionStart(text: string): number {
  const m = /exclusion criteria/i.exec(visibleText(text));
  return m ? m.index : -1;
}

// ---------------------------------------------------------------------------
// (a) Criteria split

const CRITERIA_SYSTEM = `You split the inclusion and exclusion criteria of one clinical trial into separate, numbered items.

Rules:
1. Make one item for every bullet or numbered line under the inclusion heading and the exclusion heading, in the order they appear. Do not merge lines. Do not skip lines.
2. When a line introduces a numbered sub-list (it ends with a colon and numbered lines follow it), make one item per sub-item. Put the sub-item text in "quote" and the introducing line in "parent_quote". The introducing line is not an item of its own. For every other item "parent_quote" is null.
3. "quote" and "parent_quote" are copied exactly from the text, character for character: the same words, spelling, capitals, punctuation and symbols (for example ≥ and ≤). Leave out only the leading bullet or number. Never paraphrase, shorten, correct or join text.
4. "id" is "i1", "i2", ... for inclusion items and "e1", "e2", ... for exclusion items, in order.
5. "section" is "inclusion" or "exclusion", from the heading the line sits under.
6. "askable" is true when an answer the patient can give from their own knowledge would settle the item at least one way, that is, show it is true or show it is false for them. Patients usually know: their age and sex; whether they have been through the menopause; diagnoses they have been told about (for example another cancer, hepatitis, HIV, tuberculosis, a heart condition, a bleeding disorder) and whether their cancer has spread; treatments, operations, radiotherapy, blood transfusions and medicines they have had or take now, and roughly when; pregnancy and breastfeeding; symptoms such as ongoing sickness or trouble swallowing. An item stays askable when a patient answer settles only one direction. Example: "Uncontrolled high blood pressure" is askable, because a person who has never had high blood pressure settles it, even though a "yes" would need a clinician to judge "uncontrolled".
   "askable" is false when no answer a patient could give settles the item either way, because it needs lab values or blood counts, imaging or scan findings, pathology or histology detail, genetic, molecular or tissue test results the patient would not know, heart tracing or heart function measurements, performance status ratings, knowledge of drug interactions or medicine classes a patient would not have, or a clinician's judgment.
7. "not_askable_reason": when "askable" is false, a short plain reason of a few words, such as "needs lab results" or "needs a clinician's judgment". When "askable" is true, null.`;

const CRITERIA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["criteria"],
  properties: {
    criteria: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "section", "quote", "parent_quote", "askable", "not_askable_reason"],
        properties: {
          id: { type: "string" },
          section: { type: "string", enum: ["inclusion", "exclusion"] },
          quote: { type: "string" },
          parent_quote: { anyOf: [{ type: "string" }, { type: "null" }] },
          askable: { type: "boolean" },
          not_askable_reason: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
      },
    },
  },
} as const;

export type ItemProblem = { id: string; quote: string; problems: string[] };

export type CriteriaReport = {
  returned: number;
  kept: number;
  /** Items that failed a check on the first answer and were re-asked. */
  reasked: ItemProblem[];
  /** Items that still failed after the re-ask and were dropped. */
  dropped: ItemProblem[];
  /** Bullet lines no kept item quotes. */
  uncovered_lines: string[];
  /** Criteria whose generated reason failed the wording check twice and was replaced. */
  reason_replaced: string[];
};

const FALLBACK_REASON = "needs a clinician's review";

/** Problems with one raw criterion item against the source text. */
export function criterionProblems(c: Criterion, text: string, seenQuotes: Set<string>): string[] {
  const problems: string[] = [];
  const quote = visibleText(c.quote ?? "");
  if (quote.length < 8) problems.push("quote is empty or too short to cite");
  else if (!isVerbatim(quote, text)) problems.push("quote is not an exact copy of the text");
  else if (seenQuotes.has(quote)) problems.push("quote repeats another item");
  if (c.parent_quote !== null && !isVerbatim(c.parent_quote, text)) {
    problems.push("parent_quote is not an exact copy of the text");
  }
  if (c.section !== "inclusion" && c.section !== "exclusion") problems.push("section is not inclusion or exclusion");
  const ex = exclusionStart(text);
  if (ex >= 0 && quote.length >= 8 && isVerbatim(quote, text)) {
    const at = visibleText(text).indexOf(quote);
    const inExclusion = at > ex;
    if (inExclusion && c.section !== "exclusion") problems.push("quote sits under the exclusion heading but section says inclusion");
    if (!inExclusion && c.section !== "inclusion") problems.push("quote sits under the inclusion heading but section says exclusion");
  }
  if (!c.askable) {
    if (!c.not_askable_reason || !c.not_askable_reason.trim()) problems.push("not_askable_reason is missing");
    else if (wordingProblems(c.not_askable_reason).length) problems.push("not_askable_reason uses wording that is not allowed");
  }
  return problems;
}

function cleanCriterion(c: Criterion): Criterion {
  return {
    id: String(c.id ?? ""),
    section: c.section,
    quote: visibleText(stripBullet(c.quote ?? "")),
    parent_quote: c.parent_quote ? visibleText(stripBullet(c.parent_quote)) : null,
    askable: Boolean(c.askable),
    not_askable_reason: c.askable ? null : c.not_askable_reason ? normalizeWs(c.not_askable_reason) : null,
  };
}

function covers(line: string, items: Criterion[]): boolean {
  return items.some((c) => {
    const q = c.quote;
    const p = c.parent_quote ?? "";
    return line.includes(q) || q.includes(line) || (p.length > 0 && (line.includes(p) || p.includes(line)));
  });
}

/** Validates a list of raw items; returns the clean ones and the failing ones with reasons. */
export function checkCriteria(items: Criterion[], text: string): { ok: Criterion[]; bad: ItemProblem[] } {
  const ok: Criterion[] = [];
  const bad: ItemProblem[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    const c = cleanCriterion(raw);
    const problems = criterionProblems(c, text, seen);
    if (problems.length) bad.push({ id: c.id, quote: c.quote, problems });
    else {
      ok.push(c);
      seen.add(c.quote);
    }
  }
  return { ok, bad };
}

/** Sorts by position in the text and renumbers i1.. and e1.. so ids are stable and gap free. */
export function renumber(items: Criterion[], text: string): Criterion[] {
  const norm = visibleText(text);
  const sorted = [...items].sort((a, b) => norm.indexOf(a.quote) - norm.indexOf(b.quote));
  let i = 0;
  let e = 0;
  return sorted.map((c) => ({ ...c, id: c.section === "inclusion" ? `i${++i}` : `e${++e}` }));
}

export async function splitCriteria(
  text: string,
  llm: LlmJson = openaiJson,
  usage: TokenUsage = emptyUsage(),
): Promise<{ criteria: Criterion[]; report: CriteriaReport }> {
  const messages: ChatMessage[] = [
    { role: "system", content: CRITERIA_SYSTEM },
    { role: "user", content: `Criteria text:\n<<<\n${text}\n>>>` },
  ];
  const first = await llm<{ criteria: Criterion[] }>({
    label: "criteria",
    messages,
    schemaName: "criteria_split",
    schema: CRITERIA_SCHEMA,
  });
  addUsage(usage, first.usage);
  const returned = first.data.criteria.length;
  let { ok, bad } = checkCriteria(first.data.criteria, text);
  let uncovered = criteriaLines(text).filter((l) => !covers(l.line, ok)).map((l) => l.line);
  // Lines that are only a failing item's quote are reported through that item.
  uncovered = uncovered.filter((l) => !bad.some((b) => b.quote && (l.includes(b.quote) || b.quote.includes(l))));

  const reasked = bad;
  let dropped: ItemProblem[] = [];
  const reasonReplaced: string[] = [];

  if (bad.length || uncovered.length) {
    const lines = [
      "Some items failed automatic checks. Return only corrected versions of the items listed below, keeping their ids, plus new items for any uncovered lines. Follow all the rules.",
      ...bad.map((b) => `- ${b.id}: ${b.problems.join("; ")}`),
      ...uncovered.map((l) => `- no item quotes this line: "${l}"`),
    ];
    const second = await llm<{ criteria: Criterion[] }>({
      label: "criteria re-ask",
      messages: [...messages, { role: "assistant", content: first.raw }, { role: "user", content: lines.join("\n") }],
      schemaName: "criteria_split",
      schema: CRITERIA_SCHEMA,
    });
    addUsage(usage, second.usage);

    const badIds = new Set(bad.map((b) => b.id));
    const okQuotes = new Set(ok.map((c) => c.quote));
    const candidates = second.data.criteria
      .map(cleanCriterion)
      .filter((c) => !okQuotes.has(c.quote));
    // Retry the reason-only failures with the fallback reason before dropping anything.
    const retry = checkCriteria(candidates, text);
    const second_ok: Criterion[] = [];
    for (const c of retry.ok) second_ok.push(c);
    const stillBad: ItemProblem[] = [];
    for (const b of retry.bad) {
      const onlyReason = b.problems.every((p) => p.startsWith("not_askable_reason"));
      const item = candidates.find((c) => c.id === b.id && c.quote === b.quote);
      if (onlyReason && item) {
        second_ok.push({ ...item, not_askable_reason: FALLBACK_REASON });
        reasonReplaced.push(item.quote);
      } else stillBad.push(b);
    }
    // Merge, skipping any quote already kept.
    const seen = new Set(ok.map((c) => c.quote));
    for (const c of second_ok) {
      if (seen.has(c.quote)) continue;
      ok.push(c);
      seen.add(c.quote);
    }
    // Requested items that came back unfixed, or did not come back, are dropped.
    const fixedIds = new Set(second_ok.map((c) => c.id));
    dropped = [
      ...bad.filter((b) => !fixedIds.has(b.id)).map((b) => {
        const again = stillBad.find((s) => s.id === b.id);
        return again ? again : { ...b, problems: [...b.problems, "not corrected in the re-ask"] };
      }),
      ...stillBad.filter((s) => !badIds.has(s.id)),
    ];
    uncovered = criteriaLines(text).filter((l) => !covers(l.line, ok)).map((l) => l.line);
  }

  const criteria = renumber(ok, text);
  return {
    criteria,
    report: {
      returned,
      kept: criteria.length,
      reasked,
      dropped,
      uncovered_lines: uncovered,
      reason_replaced: reasonReplaced,
    },
  };
}

// ---------------------------------------------------------------------------
// (b) Questions

const QUESTIONS_SYSTEM = `You write plain-language pre-screen questions that a member of the public answers about themselves before a clinical trial site contacts them. You get a list of criteria, each with an id and its exact text.

Rules:
1. Write between 8 and 12 questions in total. Cover as many of the listed criteria as you can; one question may cover several criteria when one answer settles all of them.
2. Each criterion is covered by at most one question. Use only the criterion ids you were given, and every question covers at least one of them.
3. Write for someone with no medical training: short sentences, everyday words, one topic per question. If a medical term is needed, keep it and add a short explanation in brackets. Address the person as "you". Ask about each criterion as written: do not widen it or narrow it. A "yes" to a wider question (for example "any back problems" for "spinal cord compression") does not show that the criterion is true.
4. Never ask for lab values, scan results or other test numbers. Never tell the person what an answer means for them, and do not mention joining, being accepted or results. Only ask.
5. Do not use dashes as punctuation in sentences; use commas or full stops.
6. "type" is one of:
   - "yes_no": the answer is "yes" or "no".
   - "choice": the person picks one of 2 to 6 short options you list in "options".
   - "number": the answer is one number; say the unit in the question, for example years or weeks.
   - "free_text": only when none of the other types can work.
   "options" is the list for "choice" and null for every other type.
7. "rules" has exactly one entry for each id in "criterion_ids". For each criterion:
   - "confirm_answers": the answers that, on their own, show that everything the criterion's text says is TRUE for this person.
   - "deny_answers": the answers that, on their own, show that the criterion's text is FALSE for this person.
   Judge only whether the criterion's text, as written, is true or false for the person. Do not consider whether that is good or bad for them.
   An answer that leaves any part of the criterion open goes in neither list; that is expected and fine. Example: for "Uncontrolled high blood pressure" asked as "Have you ever been told you have high blood pressure?", "no" goes in "deny_answers" and "yes" goes in neither list, because "yes" does not show that it is uncontrolled. When a criterion has several parts, ask in a way that one answer can settle all of them, such as a choice question whose options combine the parts. Example: for "Adult men and women", the answer "Woman" does not show that the person is an adult, so it confirms nothing; options such as "Woman aged 18 or over", "Man aged 18 or over" and "Under 18" settle every part.
   For "yes_no" use only "yes" and "no". For "choice" use only the exact option strings. For "number" both lists are empty; use "confirm_range" and "deny_range" instead, each {"min": number or null, "max": number or null}, inclusive, null meaning no limit on that side, and the two ranges must not overlap. For every type other than "number" both ranges are null. For "free_text" both lists are empty.
8. To cover more criteria, one "yes_no" question may list conditions from several criteria ("Have you had any of these: A, B or C?"). Then "no" goes in "deny_answers" for each of those criteria, and "yes" goes in neither list for all of them, because "yes" does not show which one is true. The same answer never confirms two criteria of one "yes_no" question.`;

const RANGE_SCHEMA = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["min", "max"],
      properties: {
        min: { anyOf: [{ type: "number" }, { type: "null" }] },
        max: { anyOf: [{ type: "number" }, { type: "null" }] },
      },
    },
    { type: "null" },
  ],
} as const;

const QUESTIONS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "text", "type", "options", "criterion_ids", "rules"],
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          type: { type: "string", enum: ["yes_no", "choice", "number", "free_text"] },
          options: { anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }] },
          criterion_ids: { type: "array", items: { type: "string" } },
          rules: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["criterion_id", "confirm_answers", "deny_answers", "confirm_range", "deny_range"],
              properties: {
                criterion_id: { type: "string" },
                confirm_answers: { type: "array", items: { type: "string" } },
                deny_answers: { type: "array", items: { type: "string" } },
                confirm_range: RANGE_SCHEMA,
                deny_range: RANGE_SCHEMA,
              },
            },
          },
        },
      },
    },
  },
} as const;

export const MIN_QUESTIONS = 8;
export const MAX_QUESTIONS = 12;
export const YES_NO = ["yes", "no"] as const;

export type QuestionsReport = {
  returned: number;
  kept: number;
  reasked: boolean;
  /** Problems found in the first answer (the reason for the re-ask). */
  first_problems: string[];
  /** Questions that still failed after the re-ask and were dropped. */
  dropped: { id: string; text: string; problems: string[] }[];
  /** Criterion links removed because a criterion was served twice. */
  links_removed: string[];
  /** Askable criteria no kept question serves (they map to not found). */
  askable_without_question: string[];
};

function overlaps(a: { min: number | null; max: number | null }, b: { min: number | null; max: number | null }): boolean {
  const aMin = a.min ?? -Infinity;
  const aMax = a.max ?? Infinity;
  const bMin = b.min ?? -Infinity;
  const bMax = b.max ?? Infinity;
  return aMin <= bMax && bMin <= aMax;
}

/** Problems with one question, given the criteria it may serve. */
export function questionProblems(q: Question, criteria: Criterion[]): string[] {
  const problems: string[] = [];
  const byId = new Map(criteria.map((c) => [c.id, c]));
  if (!/^q\d+$/.test(q.id)) problems.push("id is not q followed by a number");
  if (!q.text?.trim()) problems.push("text is empty");
  if (wordingProblems(q.text ?? "").length) problems.push("text uses wording that is not allowed (a verdict word or a dash)");
  if ((q.options ?? []).some((o) => wordingProblems(o).length)) problems.push("an option uses wording that is not allowed");
  if (!q.criterion_ids?.length) problems.push("serves no criterion");
  for (const id of q.criterion_ids ?? []) {
    const c = byId.get(id);
    if (!c) problems.push(`serves unknown criterion ${id}`);
    else if (!c.askable) problems.push(`serves ${id}, which is not askable`);
  }
  const ruleIds = (q.rules ?? []).map((r) => r.criterion_id);
  const idSet = new Set(q.criterion_ids ?? []);
  if (ruleIds.length !== idSet.size || ruleIds.some((r) => !idSet.has(r)) || new Set(ruleIds).size !== ruleIds.length) {
    problems.push("rules do not match criterion_ids one to one");
  }
  if (q.type === "yes_no" && (q.rules ?? []).length > 1) {
    // "yes" to "A, B or C?" does not show which one is true, so it cannot confirm several criteria.
    for (const a of YES_NO) {
      const confirming = (q.rules ?? []).filter((r) => (r.confirm_answers ?? []).includes(a)).map((r) => r.criterion_id);
      if (confirming.length > 1) {
        problems.push(`the answer "${a}" confirms several criteria (${confirming.join(", ")}); it does not show which one is true`);
      }
    }
  }
  if (q.type === "choice") {
    const opts = q.options ?? [];
    if (opts.length < 2 || opts.length > 6) problems.push("choice needs 2 to 6 options");
    if (new Set(opts).size !== opts.length) problems.push("choice options repeat");
  }
  for (const r of q.rules ?? []) {
    const label = `rule for ${r.criterion_id}`;
    const conf = r.confirm_answers ?? [];
    const deny = r.deny_answers ?? [];
    if (conf.some((a) => deny.includes(a))) problems.push(`${label}: an answer both confirms and denies`);
    if (q.type === "yes_no" || q.type === "choice") {
      const allowed: readonly string[] = q.type === "yes_no" ? YES_NO : (q.options ?? []);
      if ([...conf, ...deny].some((a) => !allowed.includes(a))) problems.push(`${label}: uses an answer that is not offered`);
      if (!conf.length && !deny.length) problems.push(`${label}: no answer confirms or denies`);
    }
    if (q.type === "number") {
      if (conf.length || deny.length) problems.push(`${label}: number questions use ranges, not answer lists`);
      const ranges = [r.confirm_range, r.deny_range].filter(Boolean) as { min: number | null; max: number | null }[];
      if (!ranges.length) problems.push(`${label}: no range given`);
      for (const g of ranges) {
        if (g.min === null && g.max === null) problems.push(`${label}: a range has no limits`);
        if (g.min !== null && g.max !== null && g.min > g.max) problems.push(`${label}: a range has min above max`);
      }
      if (r.confirm_range && r.deny_range && overlaps(r.confirm_range, r.deny_range)) {
        problems.push(`${label}: confirm and deny ranges overlap`);
      }
    }
  }
  return problems;
}

function cleanQuestion(q: Question): Question {
  const type: QuestionType = q.type;
  return {
    id: String(q.id ?? ""),
    text: normalizeWs(q.text ?? ""),
    type,
    options: type === "choice" ? (q.options ?? []).map(normalizeWs) : null,
    criterion_ids: [...new Set(q.criterion_ids ?? [])],
    rules: (q.rules ?? []).map(
      (r): QuestionRule => ({
        criterion_id: r.criterion_id,
        confirm_answers: type === "number" || type === "free_text" ? [] : (r.confirm_answers ?? []).map((a) => normalizeWs(a)),
        deny_answers: type === "number" || type === "free_text" ? [] : (r.deny_answers ?? []).map((a) => normalizeWs(a)),
        confirm_range: type === "number" ? (r.confirm_range ?? null) : null,
        deny_range: type === "number" ? (r.deny_range ?? null) : null,
      }),
    ),
  };
}

/** Whole-set problems: count, duplicate ids, a criterion served twice. */
export function questionSetProblems(qs: Question[]): string[] {
  const problems: string[] = [];
  if (qs.length < MIN_QUESTIONS || qs.length > MAX_QUESTIONS) {
    problems.push(`there are ${qs.length} questions; write between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}`);
  }
  const ids = qs.map((q) => q.id);
  if (new Set(ids).size !== ids.length) problems.push("question ids repeat");
  const servedBy = new Map<string, string[]>();
  for (const q of qs) for (const c of q.criterion_ids) servedBy.set(c, [...(servedBy.get(c) ?? []), q.id]);
  for (const [c, by] of servedBy) if (by.length > 1) problems.push(`criterion ${c} is covered by more than one question (${by.join(", ")})`);
  return problems;
}

export async function writeQuestions(
  criteria: Criterion[],
  llm: LlmJson = openaiJson,
  usage: TokenUsage = emptyUsage(),
): Promise<{ questions: Question[]; report: QuestionsReport }> {
  const askable = criteria.filter((c) => c.askable);
  const list = askable.map((c) => ({ id: c.id, text: c.parent_quote ? `${c.parent_quote} ${c.quote}` : c.quote }));
  const messages: ChatMessage[] = [
    { role: "system", content: QUESTIONS_SYSTEM },
    { role: "user", content: `Criteria:\n${JSON.stringify(list, null, 2)}` },
  ];
  const first = await llm<{ questions: Question[] }>({
    label: "questions",
    messages,
    schemaName: "prescreen_questions",
    schema: QUESTIONS_SCHEMA,
  });
  addUsage(usage, first.usage);

  const describe = (qs: Question[]) => [
    ...questionSetProblems(qs),
    ...qs.flatMap((q) => questionProblems(q, criteria).map((p) => `${q.id}: ${p}`)),
  ];

  let qs = first.data.questions.map(cleanQuestion);
  const returned = qs.length;
  const firstProblems = describe(qs);
  let reasked = false;

  if (firstProblems.length) {
    reasked = true;
    const second = await llm<{ questions: Question[] }>({
      label: "questions re-ask",
      messages: [
        ...messages,
        { role: "assistant", content: first.raw },
        {
          role: "user",
          content: `Your questions failed automatic checks. Return the full corrected list, following all the rules.\n${firstProblems.map((p) => `- ${p}`).join("\n")}`,
        },
      ],
      schemaName: "prescreen_questions",
      schema: QUESTIONS_SCHEMA,
    });
    addUsage(usage, second.usage);
    qs = second.data.questions.map(cleanQuestion);
  }

  // After the one re-ask: drop questions that still fail, then remove double links.
  const dropped: QuestionsReport["dropped"] = [];
  qs = qs.filter((q) => {
    const p = questionProblems(q, criteria);
    if (p.length) dropped.push({ id: q.id, text: q.text, problems: p });
    return p.length === 0;
  });
  const seenIds = new Set<string>();
  qs = qs.filter((q) => {
    if (seenIds.has(q.id)) {
      dropped.push({ id: q.id, text: q.text, problems: ["repeats an earlier question id"] });
      return false;
    }
    seenIds.add(q.id);
    return true;
  });
  const linksRemoved: string[] = [];
  const linked = new Set<string>();
  qs = qs
    .map((q) => {
      const keep = q.criterion_ids.filter((c) => {
        if (linked.has(c)) {
          linksRemoved.push(`${q.id} no longer covers ${c} (already covered)`);
          return false;
        }
        linked.add(c);
        return true;
      });
      return { ...q, criterion_ids: keep, rules: q.rules.filter((r) => keep.includes(r.criterion_id)) };
    })
    .filter((q) => {
      if (q.criterion_ids.length) return true;
      dropped.push({ id: q.id, text: q.text, problems: ["covered no criterion after removing double links"] });
      return false;
    });
  // Still over the limit after the one re-ask: keep the first MAX_QUESTIONS in the model's order.
  for (const q of qs.slice(MAX_QUESTIONS)) {
    dropped.push({ id: q.id, text: q.text, problems: [`over the ${MAX_QUESTIONS} question limit`] });
  }
  qs = qs.slice(0, MAX_QUESTIONS);
  const served = new Set(qs.flatMap((q) => q.criterion_ids));

  return {
    questions: qs,
    report: {
      returned,
      kept: qs.length,
      reasked,
      first_problems: firstProblems,
      dropped,
      links_removed: linksRemoved,
      askable_without_question: askable.filter((c) => !served.has(c.id)).map((c) => c.id),
    },
  };
}

// ---------------------------------------------------------------------------

export type GenerationReport = {
  model: string;
  usage: TokenUsage;
  criteria: CriteriaReport;
  questions: QuestionsReport;
  /** Wording or count problems left after the re-asks; empty when everything passed. */
  open_problems: string[];
};

/** Both steps for one trial's criteria text. */
export async function generateForTrial(
  text: string,
  llm: LlmJson = openaiJson,
): Promise<{ criteria: Criterion[]; questions: Question[]; report: GenerationReport }> {
  const usage = emptyUsage();
  const a = await splitCriteria(text, llm, usage);
  const b = await writeQuestions(a.criteria, llm, usage);
  const open = questionSetProblems(b.questions);
  console.log(
    `[generate] ${a.criteria.length} criteria (${a.report.dropped.length} dropped), ${b.questions.length} questions; ` +
      `${usage.calls} calls, ${usage.prompt_tokens} in, ${usage.completion_tokens} out`,
  );
  return {
    criteria: a.criteria,
    questions: b.questions,
    report: { model: MODEL, usage, criteria: a.report, questions: b.report, open_problems: open },
  };
}
