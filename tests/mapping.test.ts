import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mapDeterministic, mapSubmission, stateFor } from "@/lib/mapping";
import { countsLine } from "@/lib/states";
import type { JsonCall, JsonResult, LlmJson } from "@/lib/openai";
import type { Answers, Criterion, Question } from "@/lib/types";
import { findVerdictWord } from "@/lib/wording";

const FIX = JSON.parse(readFileSync(join(__dirname, "fixtures", "NCT06380751.generated.json"), "utf8")) as {
  criteria: Criterion[];
  questions: Question[];
};

// Fixed answers from a fictional patient. q8 is left unanswered on purpose.
const ANSWERS: Answers = {
  q1: "Adult female, post-menopausal", // i1 inclusion, confirms -> met
  q2: "no", // i3 inclusion, denies -> not met
  q3: "no", // e1 exclusion, denies -> met
  q4: "yes", // e2 exclusion, confirms -> not met (the flip)
  q5: "unsure", // e3 -> not found
  q6: "no", // e5 exclusion, denies -> met
  q7: "yes", // e6 exclusion, confirms -> not met (the flip)
  q9: "no", // e9 -> met
  q10: "no", // e10 -> met
  q11: "no", // e11 -> met
  q12: "yes", // e12 exclusion, confirms -> not met (the flip)
};

// The exact four-state table: [criterion, state, quoted answer].
const EXPECTED: [string, string, string | null][] = [
  ["i1", "met", "Adult female, post-menopausal"],
  ["i2", "needs_clinician", null],
  ["i3", "not_met", "no"],
  ["i4", "needs_clinician", null],
  ["i5", "needs_clinician", null],
  ["i6", "needs_clinician", null],
  ["i7", "needs_clinician", null],
  ["e1", "met", "no"],
  ["e2", "not_met", "yes"],
  ["e3", "not_found", "unsure"],
  ["e4", "needs_clinician", null],
  ["e5", "met", "no"],
  ["e6", "not_met", "yes"],
  ["e7", "needs_clinician", null],
  ["e8", "not_found", null], // q8 unanswered
  ["e9", "met", "no"],
  ["e10", "met", "no"],
  ["e11", "met", "no"],
  ["e12", "not_met", "yes"],
  ["e13", "not_found", null], // askable, no question
  ["e14", "not_found", null],
  ["e15", "not_found", null],
  ["e16", "not_found", null],
  ["e17", "not_found", null],
  ["e18", "not_found", null],
  ["e19", "needs_clinician", null],
  ["e20", "needs_clinician", null],
  ["e21", "needs_clinician", null],
  ["e22", "needs_clinician", null],
  ["e23", "not_found", null],
  ["e24", "needs_clinician", null],
  ["e25", "needs_clinician", null],
  ["e26", "needs_clinician", null],
  ["e27", "needs_clinician", null],
];

const neverCalled: LlmJson = async () => {
  throw new Error("the model must not be called for yes_no, choice or number answers");
};

describe("mapping on the NCT06380751 fixture", () => {
  it("the fixture is the one the expected table was written for", () => {
    expect(FIX.criteria.map((c) => c.id)).toEqual(EXPECTED.map((e) => e[0]));
    expect(FIX.questions.map((q) => `${q.id}:${q.criterion_ids.join(",")}`)).toEqual([
      "q1:i1", "q2:i3", "q3:e1", "q4:e2", "q5:e3", "q6:e5", "q7:e6", "q8:e8", "q9:e9", "q10:e10", "q11:e11", "q12:e12",
    ]);
  });

  it("returns the exact four-state table, without calling the model", async () => {
    const { rows, usage } = await mapSubmission(FIX.criteria, FIX.questions, ANSWERS, neverCalled);
    expect(rows.map((r) => [r.criterion_id, r.state, r.quoted_answer])).toEqual(EXPECTED);
    expect(usage.calls).toBe(0);
    for (const r of rows) {
      const c = FIX.criteria.find((x) => x.id === r.criterion_id)!;
      expect(r.quoted_criterion).toBe(c.parent_quote ? `${c.parent_quote} ${c.quote}` : c.quote);
    }
    expect(countsLine(rows)).toBe("6 met · 4 not met · 9 not found · 15 need a clinician");
  });

  it("the exclusion flip, unanswered and not askable each behave as specified", async () => {
    const { rows } = await mapSubmission(FIX.criteria, FIX.questions, ANSWERS, neverCalled);
    const s = Object.fromEntries(rows.map((r) => [r.criterion_id, r.state]));
    expect(s.e2).toBe("not_met"); // "yes" to the excluded condition
    expect(s.e1).toBe("met"); // "no" to the excluded condition
    expect(s.i3).toBe("not_met"); // inclusion, no flip
    expect(s.e8).toBe("not_found"); // unanswered
    expect(s.i4).toBe("needs_clinician"); // not askable
    expect(stateFor("inclusion", "confirms")).toBe("met");
    expect(stateFor("exclusion", "confirms")).toBe("not_met");
    expect(stateFor("exclusion", "denies")).toBe("met");
    expect(stateFor("inclusion", "unsettled")).toBe("not_found");
  });

  it("an empty submission maps every askable criterion to not found", async () => {
    const { rows } = await mapSubmission(FIX.criteria, FIX.questions, {}, neverCalled);
    for (const r of rows) {
      const c = FIX.criteria.find((x) => x.id === r.criterion_id)!;
      expect(r.state).toBe(c.askable ? "not_found" : "needs_clinician");
      expect(r.quoted_answer).toBeNull();
    }
  });

  it("an answer that is not one of the offered options is not found", () => {
    const { rows } = mapDeterministic(FIX.criteria, FIX.questions, { q1: "Adult female" });
    expect(rows.find((r) => r.criterion_id === "i1")?.state).toBe("not_found");
  });

  it("run twice: identical output", async () => {
    const a = await mapSubmission(FIX.criteria, FIX.questions, ANSWERS, neverCalled);
    const b = await mapSubmission(FIX.criteria, FIX.questions, ANSWERS, neverCalled);
    expect(JSON.stringify(b.rows)).toBe(JSON.stringify(a.rows));
    const hash = createHash("sha256").update(JSON.stringify(a.rows)).digest("hex").slice(0, 16);
    console.log(`mapping table sha256 ${hash}`);
  });
});

// Hand-made number and free_text cases (fictional criteria) for the paths the fixture does not use.
const C: Criterion[] = [
  { id: "i1", section: "inclusion", quote: "Age 18 years or older", parent_quote: null, askable: true, not_askable_reason: null },
  { id: "e1", section: "exclusion", quote: "Major surgery within 4 weeks before the first dose", parent_quote: null, askable: true, not_askable_reason: null },
  { id: "e2", section: "exclusion", quote: "Currently pregnant or breastfeeding", parent_quote: null, askable: true, not_askable_reason: null },
  { id: "e3", section: "exclusion", quote: "Known allergy to the study drug", parent_quote: null, askable: true, not_askable_reason: null },
];
const Q: Question[] = [
  {
    id: "q1", text: "How old are you, in years?", type: "number", options: null, criterion_ids: ["i1"],
    rules: [{ criterion_id: "i1", confirm_answers: [], deny_answers: [], confirm_range: { min: 18, max: null }, deny_range: { min: null, max: 17 } }],
  },
  {
    id: "q2", text: "Tell us about any operations in the last two months and anything else about your health.", type: "free_text",
    options: null, criterion_ids: ["e1", "e2", "e3"],
    rules: ["e1", "e2", "e3"].map((c) => ({ criterion_id: c, confirm_answers: [], deny_answers: [], confirm_range: null, deny_range: null })),
  },
];

/** Scripted free_text readings, keyed by criterion id, and a record of every call. */
function fakeReader(byCriterion: Record<string, { state: string; quoted_answer: string }>) {
  const calls: JsonCall[] = [];
  const llm = (async <T>(call: JsonCall): Promise<JsonResult<T>> => {
    calls.push(call);
    const id = call.label.replace("free_text ", "");
    const data = byCriterion[id];
    return { data: data as T, raw: JSON.stringify(data), usage: { prompt_tokens: 50, completion_tokens: 10 } };
  }) as LlmJson;
  return { llm, calls };
}

describe("number and free_text mapping", () => {
  it("number ranges are inclusive; outside both ranges or not a number is not found", () => {
    const at = (v: Answers[string]) => mapDeterministic(C, Q, { q1: v }).rows.find((r) => r.criterion_id === "i1")?.state;
    expect(at(18)).toBe("met");
    expect(at("64")).toBe("met");
    expect(at(17)).toBe("not_met");
    expect(at(17.5)).toBe("not_found");
    expect(at("about forty")).toBe("not_found");
    expect(at("")).toBe("not_found");
  });

  it("one model call per criterion; quote must be verbatim; the flip is done in code", async () => {
    const answer = "I had my gallbladder removed three weeks ago. I am not pregnant.";
    const { llm, calls } = fakeReader({
      e1: { state: "shows_true", quoted_answer: "I had my gallbladder removed three weeks ago." },
      e2: { state: "shows_false", quoted_answer: "I am not pregnant" },
      e3: { state: "shows_false", quoted_answer: "I have no allergies" }, // not in the answer
    });
    const { rows, usage } = await mapSubmission(C, Q, { q1: 40, q2: answer }, llm);
    expect(calls.map((c) => c.label).sort()).toEqual(["free_text e1", "free_text e2", "free_text e3"]);
    expect(usage.calls).toBe(3);
    expect(rows.map((r) => [r.criterion_id, r.state, r.quoted_answer])).toEqual([
      ["i1", "met", "40"],
      ["e1", "not_met", "I had my gallbladder removed three weeks ago."], // shows_true on an exclusion -> not met
      ["e2", "met", "I am not pregnant"],
      ["e3", "not_found", answer], // quote not verbatim -> not found, full answer quoted
    ]);
    // The model is told nothing about sections or outcomes, and sees no verdict words.
    for (const call of calls) {
      for (const m of call.messages) {
        expect(findVerdictWord(m.content)).toBeNull();
        expect(m.content.toLowerCase()).not.toContain("exclusion");
        expect(m.content.toLowerCase()).not.toContain("inclusion");
      }
      expect(findVerdictWord(JSON.stringify(call.schema))).toBeNull();
    }
  });

  it("an unanswered free_text question makes no call and maps to not found", async () => {
    const { llm, calls } = fakeReader({});
    const { rows } = await mapSubmission(C, Q, { q1: 40 }, llm);
    expect(calls).toHaveLength(0);
    expect(rows.filter((r) => r.question_id === "q2").map((r) => r.state)).toEqual(["not_found", "not_found", "not_found"]);
  });

  it("not_stated from the model is not found", async () => {
    const { llm } = fakeReader({
      e1: { state: "not_stated", quoted_answer: "" },
      e2: { state: "not_stated", quoted_answer: "" },
      e3: { state: "not_stated", quoted_answer: "" },
    });
    const { rows } = await mapSubmission(C, Q, { q2: "Nothing to add." }, llm);
    expect(rows.slice(1).map((r) => r.state)).toEqual(["not_found", "not_found", "not_found"]);
  });
});
