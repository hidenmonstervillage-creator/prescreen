import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkCriteria,
  criteriaLines,
  isVerbatim,
  normalizeWs,
  questionProblems,
  splitCriteria,
  writeQuestions,
} from "@/lib/generate";
import type { JsonCall, JsonResult, LlmJson } from "@/lib/openai";
import type { Criterion, Question } from "@/lib/types";
import { VERDICT_WORDS, findVerdictWord, hasEmDash } from "@/lib/wording";

const TEXT = readFileSync(join(__dirname, "fixtures", "NCT06380751.criteria.md"), "utf8");
const EM = String.fromCharCode(0x2014);

/** Replays scripted answers in order and records every call it receives. */
function fakeLlm(answers: unknown[]): LlmJson & { calls: JsonCall[] } {
  const calls: JsonCall[] = [];
  const fn = (async <T>(call: JsonCall): Promise<JsonResult<T>> => {
    calls.push(call);
    const next = answers[calls.length - 1];
    if (next === undefined) throw new Error(`unexpected call ${calls.length}: ${call.label}`);
    return { data: next as T, raw: JSON.stringify(next), usage: { prompt_tokens: 100, completion_tokens: 50 } };
  }) as LlmJson & { calls: JsonCall[] };
  fn.calls = calls;
  return fn;
}

/** Every message the model would see is free of verdict words. */
function expectCleanPrompts(calls: JsonCall[]) {
  for (const c of calls) {
    for (const m of c.messages) {
      if (m.role === "assistant") continue; // the model's own earlier answer, echoed back
      expect(findVerdictWord(m.content), `${c.label} ${m.role}`).toBeNull();
    }
    expect(findVerdictWord(JSON.stringify(c.schema))).toBeNull();
  }
}

/** A model answer that quotes every bullet line of the fixture correctly. */
function perfectSplit(): Criterion[] {
  let i = 0;
  let e = 0;
  return criteriaLines(TEXT).map((l, k) => ({
    id: l.section === "inclusion" ? `i${++i}` : `e${++e}`,
    section: l.section,
    quote: l.line,
    parent_quote: null,
    askable: k % 2 === 0,
    not_askable_reason: k % 2 === 0 ? null : "needs lab results",
  }));
}

describe("verbatim check on the NCT06380751 fixture", () => {
  it("accepts exact quotes, ignoring whitespace only", () => {
    expect(isVerbatim("Active tuberculosis infection", TEXT)).toBe(true);
    expect(isVerbatim("Active   tuberculosis\n infection", TEXT)).toBe(true);
    expect(isVerbatim("Persistent toxicities (CTCAE Grade ≥ 2) caused by previous anti-cancer therapy excluding alopecia", TEXT)).toBe(true);
  });

  it("rejects paraphrase, case changes and corrected spelling", () => {
    expect(isVerbatim("Active TB infection", TEXT)).toBe(false);
    expect(isVerbatim("active tuberculosis infection", TEXT)).toBe(false);
    expect(isVerbatim("history of arrhythmia", TEXT)).toBe(false); // source spells it "arrythmia"
    expect(isVerbatim("", TEXT)).toBe(false);
  });

  it("finds the bullet lines of both sections, including the numbered sub-lists", () => {
    const lines = criteriaLines(TEXT);
    expect(lines.filter((l) => l.section === "inclusion")).toHaveLength(7);
    expect(lines.filter((l) => l.section === "exclusion")).toHaveLength(29);
    expect(lines.at(-1)?.line).toBe(
      "Disease progression ≤ 1 year (365 days) from the last dose of an oral SERD including camizestrant.",
    );
  });

  it("checkCriteria flags each kind of bad item", () => {
    const base: Criterion = {
      id: "e11",
      section: "exclusion",
      quote: "Active tuberculosis infection",
      parent_quote: null,
      askable: true,
      not_askable_reason: null,
    };
    const { ok, bad } = checkCriteria(
      [
        base,
        { ...base, id: "e12", quote: "Active TB infection" },
        { ...base, id: "i9", section: "inclusion", quote: "History of another primary malignancy" },
        { ...base, id: "e13", quote: "Systemic use of atropine", askable: false, not_askable_reason: null },
        { ...base, id: "e14", quote: "Active tuberculosis infection" },
        { ...base, id: "e15", quote: "* Systemic use of atropine", askable: false, not_askable_reason: `needs ${EM} a doctor` },
      ],
      TEXT,
    );
    expect(ok.map((c) => c.id)).toEqual(["e11"]);
    const by = Object.fromEntries(bad.map((b) => [b.id, b.problems]));
    expect(by.e12).toContain("quote is not an exact copy of the text");
    expect(by.i9).toContain("quote sits under the exclusion heading but section says inclusion");
    expect(by.e13).toContain("not_askable_reason is missing");
    expect(by.e14).toContain("quote repeats another item");
    expect(by.e15).toEqual(["not_askable_reason uses wording that is not allowed"]); // bullet stripped, quote fine
  });
});

describe("splitCriteria", () => {
  it("one call when everything checks out; renumbers in text order", async () => {
    const llm = fakeLlm([{ criteria: perfectSplit() }]);
    const { criteria, report } = await splitCriteria(TEXT, llm);
    expect(llm.calls).toHaveLength(1);
    expect(criteria).toHaveLength(36);
    expect(criteria[0].id).toBe("i1");
    expect(criteria[7].id).toBe("e1");
    expect(report.reasked).toEqual([]);
    expect(report.dropped).toEqual([]);
    expect(report.uncovered_lines).toEqual([]);
    for (const c of criteria) expect(isVerbatim(c.quote, TEXT)).toBe(true);
    expectCleanPrompts(llm.calls);
  });

  it("re-asks once for failing items, keeps the fixed one and drops and reports the other", async () => {
    const items = perfectSplit();
    const tb = items.find((c) => c.quote === "Active tuberculosis infection")!;
    const hiv = items.find((c) => c.quote.startsWith("Evidence of active and uncontrolled HIV"))!;
    tb.quote = "Active TB infection"; // paraphrase
    hiv.quote = "Evidence of HIV"; // paraphrase
    const fixedTb = { ...tb, quote: "Active tuberculosis infection" };
    const stillBadHiv = { ...hiv, quote: "Evidence of uncontrolled HIV" };
    const llm = fakeLlm([{ criteria: items }, { criteria: [fixedTb, stillBadHiv] }]);

    const { criteria, report } = await splitCriteria(TEXT, llm);
    expect(llm.calls.map((c) => c.label)).toEqual(["criteria", "criteria re-ask"]);
    expect(criteria).toHaveLength(35);
    expect(criteria.some((c) => c.quote === "Active tuberculosis infection")).toBe(true);
    expect(report.reasked.map((r) => r.quote).sort()).toEqual(["Active TB infection", "Evidence of HIV"]);
    expect(report.dropped).toHaveLength(1);
    expect(report.dropped[0].problems).toContain("quote is not an exact copy of the text");
    expect(report.uncovered_lines).toEqual(["Evidence of active and uncontrolled HIV infection"]);
    expect(llm.calls[1].messages.at(-1)?.content).toContain("quote is not an exact copy of the text");
    expectCleanPrompts(llm.calls);
  });

  it("asks for lines the model skipped", async () => {
    const items = perfectSplit().filter((c) => c.quote !== "Systemic use of atropine");
    const add = { ...perfectSplit().find((c) => c.quote === "Systemic use of atropine")!, id: "e99" };
    const llm = fakeLlm([{ criteria: items }, { criteria: [add] }]);
    const { criteria, report } = await splitCriteria(TEXT, llm);
    expect(llm.calls[1].messages.at(-1)?.content).toContain('no item quotes this line: "Systemic use of atropine"');
    expect(criteria).toHaveLength(36);
    expect(report.uncovered_lines).toEqual([]);
  });
});

// Small hand-made criteria set drawn from the fixture, for the question checks.
const CRITERIA: Criterion[] = [
  { id: "i1", section: "inclusion", quote: "Adult females, pre/peri-menopausal and/or post-menopausal, and adult males", parent_quote: null, askable: true, not_askable_reason: null },
  { id: "i2", section: "inclusion", quote: "ECOG performance status of 0 or 1 with no deterioration over the previous 2 weeks", parent_quote: null, askable: false, not_askable_reason: "needs a clinician's judgment" },
  { id: "e1", section: "exclusion", quote: "History of another primary malignancy", parent_quote: null, askable: true, not_askable_reason: null },
  { id: "e2", section: "exclusion", quote: "Active tuberculosis infection", parent_quote: null, askable: true, not_askable_reason: null },
];

function yesNo(id: string, text: string, criterion: string): Question {
  return {
    id,
    text,
    type: "yes_no",
    options: null,
    criterion_ids: [criterion],
    rules: [{ criterion_id: criterion, confirm_answers: ["yes"], deny_answers: ["no"], confirm_range: null, deny_range: null }],
  };
}

/** One valid question per askable criterion: number, yes_no, yes_no. */
function three(): Question[] {
  return [
    {
      id: "q1",
      text: "How old are you, in years?",
      type: "number",
      options: null,
      criterion_ids: ["i1"],
      rules: [{ criterion_id: "i1", confirm_answers: [], deny_answers: [], confirm_range: { min: 18, max: null }, deny_range: { min: null, max: 17 } }],
    },
    yesNo("q2", "Have you ever had a different cancer before this one?", "e1"),
    yesNo("q3", "Do you have tuberculosis (TB) right now?", "e2"),
  ];
}

describe("question checks", () => {
  it("flags a question that serves a criterion that is not askable", () => {
    const q = yesNo("q9", "Can you do your normal daily activities?", "i2");
    expect(questionProblems(q, CRITERIA)).toContain("serves i2, which is not askable");
  });

  it("flags verdict words and em dashes without naming the word", () => {
    const verdict = yesNo("q9", `Are you ${VERDICT_WORDS[0]} for this?`, "e2");
    const dash = yesNo("q10", `Do you have TB ${EM} right now?`, "e2");
    for (const q of [verdict, dash]) {
      const p = questionProblems(q, CRITERIA);
      expect(p).toContain("text uses wording that is not allowed (a verdict word or a dash)");
      expect(p.join(" ")).not.toContain(VERDICT_WORDS[0]);
    }
  });

  it("flags a yes_no question whose one answer confirms several criteria, and allows a shared deny", () => {
    const both: Question = {
      id: "q9",
      text: "Have you ever had another cancer, or do you have tuberculosis now?",
      type: "yes_no",
      options: null,
      criterion_ids: ["e1", "e2"],
      rules: ["e1", "e2"].map((c) => ({ criterion_id: c, confirm_answers: ["yes"], deny_answers: ["no"], confirm_range: null, deny_range: null })),
    };
    expect(questionProblems(both, CRITERIA)).toContain(
      'the answer "yes" confirms several criteria (e1, e2); it does not show which one is true',
    );
    const denyOnly: Question = {
      ...both,
      rules: both.rules.map((r) => ({ ...r, confirm_answers: [] })),
    };
    expect(questionProblems(denyOnly, CRITERIA)).toEqual([]);
  });

  it("flags rules that do not fit the question type", () => {
    const q = yesNo("q9", "Do you have TB?", "e2");
    q.rules[0].confirm_answers = ["maybe"];
    expect(questionProblems(q, CRITERIA)).toContain("rule for e2: uses an answer that is not offered");
    const n: Question = { ...three()[0], rules: [{ ...three()[0].rules[0], deny_range: { min: 10, max: 30 } }] };
    expect(questionProblems(n, CRITERIA)).toContain("rule for i1: confirm and deny ranges overlap");
  });
});

describe("writeQuestions", () => {
  it("re-asks once when a question uses a verdict word, and the re-ask never names the word", async () => {
    const bad = three();
    bad[1] = { ...bad[1], text: `Are you ${VERDICT_WORDS[0]} after having another cancer?` };
    const good = three();
    // Three askable criteria cannot carry 8 questions, so the count problem stays open here;
    // this test is about the wording path. The live test covers the 8 to 12 count.
    const llm = fakeLlm([{ questions: bad }, { questions: good }]);
    const { questions, report } = await writeQuestions(CRITERIA, llm);
    expect(llm.calls.map((c) => c.label)).toEqual(["questions", "questions re-ask"]);
    expect(report.reasked).toBe(true);
    expect(report.first_problems).toContain("q2: text uses wording that is not allowed (a verdict word or a dash)");
    expect(questions.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
    for (const q of questions) expect(findVerdictWord(q.text) === null && !hasEmDash(q.text)).toBe(true);
    expectCleanPrompts(llm.calls);
    // The model only ever sees askable criteria.
    const sent = llm.calls[0].messages[1].content;
    expect(sent).not.toContain("ECOG");
    expect(normalizeWs(sent)).toContain("History of another primary malignancy");
  });

  it("drops a question still failing after the re-ask and reports criteria left without a question", async () => {
    const qs = three();
    const askI2 = yesNo("q4", "Can you do your normal daily activities?", "i2");
    const llm = fakeLlm([{ questions: [...qs, askI2] }, { questions: [qs[0], qs[1], askI2] }]);
    const { questions, report } = await writeQuestions(CRITERIA, llm);
    expect(questions.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(report.dropped.map((d) => d.id)).toEqual(["q4"]);
    expect(report.askable_without_question).toEqual(["e2"]);
  });

  it("keeps the first 12 when the re-ask still returns more, and reports the rest", async () => {
    const many: Criterion[] = Array.from({ length: 14 }, (_, k) => ({
      id: `e${k + 1}`,
      section: "exclusion",
      quote: `Fictional condition number ${k + 1}`,
      parent_quote: null,
      askable: true,
      not_askable_reason: null,
    }));
    const qs = many.map((c, k) => yesNo(`q${k + 1}`, `Do you have fictional condition ${k + 1}?`, c.id));
    const llm = fakeLlm([{ questions: qs }, { questions: qs }]);
    const { questions, report } = await writeQuestions(many, llm);
    expect(llm.calls).toHaveLength(2);
    expect(report.first_problems).toContain("there are 14 questions; write between 8 and 12");
    expect(questions).toHaveLength(12);
    expect(report.dropped.map((d) => [d.id, d.problems[0]])).toEqual([
      ["q13", "over the 12 question limit"],
      ["q14", "over the 12 question limit"],
    ]);
    expect(report.askable_without_question).toEqual(["e13", "e14"]);
  });

  it("removes a second link to the same criterion after the re-ask", async () => {
    const qs = three();
    const dup = yesNo("q4", "Have you had cancer of another kind?", "e1");
    const llm = fakeLlm([{ questions: [...qs, dup] }, { questions: [...qs, dup] }]);
    const { questions, report } = await writeQuestions(CRITERIA, llm);
    expect(report.links_removed).toEqual(["q4 no longer covers e1 (already covered)"]);
    expect(questions.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
  });
});
