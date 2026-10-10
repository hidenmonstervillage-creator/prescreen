// The three guards on generation, with NCT06064877's own registry wording (tests/fixtures, verbatim):
// permissions are never asked (its i11, the q6 case), a yes or no or choice question on a time window
// is refused (its e4 to e7 washout, the q9 case), and every model yes or no rule has one polarity:
// "yes" may only confirm the criterion's text and "no" may only deny it. A refused rule is re-asked once
// for its criterion only; a second failure sends the criterion to the research team.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import GenerationSummary from "@/components/GenerationSummary";
import { criteriaLines, generateForTrial, writeQuestions } from "@/lib/generate";
import { applyMustAsk, isPermissive, permissionGuard } from "@/lib/must-ask";
import { mapDeterministic } from "@/lib/mapping";
import type { JsonCall, JsonResult, LlmJson } from "@/lib/openai";
import { NEGATIVE_STEM_RE, guardSummaryText, halfLifeGuard, isTimeWindow, rejectedRulesText, ruleRejections } from "@/lib/rule-guard";
import type { Criterion, Question, QuestionRule, Section } from "@/lib/types";
import { findVerdictWord, hasEmDash } from "@/lib/wording";

const TEXT = readFileSync(join(__dirname, "fixtures", "NCT06064877.criteria.md"), "utf8");
const LINES = criteriaLines(TEXT);
const line = (start: string) => {
  const l = LINES.find((x) => x.line.startsWith(start));
  if (!l) throw new Error(`no line starts with ${start}`);
  return l.line;
};

function fakeLlm(answers: unknown[]): LlmJson & { calls: JsonCall[] } {
  const calls: JsonCall[] = [];
  const fn = (async <T,>(call: JsonCall): Promise<JsonResult<T>> => {
    calls.push(call);
    const next = answers[calls.length - 1];
    if (next === undefined) throw new Error(`unexpected call ${calls.length}: ${call.label}`);
    return { data: next as T, raw: JSON.stringify(next), usage: { prompt_tokens: 100, completion_tokens: 50 } };
  }) as LlmJson & { calls: JsonCall[] };
  fn.calls = calls;
  return fn;
}

const crit = (id: string, section: Section, quote: string, parent_quote: string | null = null): Criterion => ({
  id,
  section,
  quote,
  parent_quote,
  askable: true,
  not_askable_reason: null,
});

const rule = (criterion_id: string, confirm: string[], deny: string[]): QuestionRule => ({
  criterion_id,
  confirm_answers: confirm,
  deny_answers: deny,
  confirm_range: null,
  deny_range: null,
});

const yesNo = (id: string, text: string, criterion: string, confirm = ["yes"], deny = ["no"]): Question => ({
  id,
  text,
  type: "yes_no",
  options: null,
  criterion_ids: [criterion],
  rules: [rule(criterion, confirm, deny)],
});

// NCT06064877, as the split numbered it on production (26 criteria; e4 to e7 are the washout sub-items).
const WASHOUT_PARENT = line("Prior treatment with any other investigational drug");
const WASHOUT = [line("2 weeks (14 days) or 5 half-lives"), line("3 weeks (21 days)"), line("4 weeks (28 days)"), line("2 weeks (14 days) for radiation")];
const I11 = line("Patients with feeding tubes");
const E2 = line("History of severe allergic");
const E3 = line("Known or suspected untreated");
const E9 = line("Significant cardiovascular disease");

describe("guard 2: permissions are never asked (the q6 case)", () => {
  it("NCT06064877 i11 is a permission; its brain metastases note does not make e3 one", () => {
    expect(isPermissive(I11)).toBe(true);
    // The permission in e3 sits after "Note:", outside its stem.
    expect(isPermissive(E3)).toBe(false);
  });

  it.each([
    ["May have received PD-(L)1 monoclonal antibody (concurrently or sequentially with platinum-based chemotherapy)."],
    ["Prior radiotherapy is allowed if completed at least 2 weeks before the first dose"],
    ["Bisphosphonates are permitted"],
    ["Participants on a stable dose of steroids can be included"],
    ["Participants who complete the parent study remain " + "elig" + "ible to continue"],
  ])("permission: %s", (text) => {
    expect(isPermissive(text)).toBe(true);
  });

  it.each([["Prior treatment with systemic anti-cancer therapy for metastatic disease is not permitted"], ["History of another primary malignancy"]])(
    "not a permission: %s",
    (text) => expect(isPermissive(text)).toBe(false),
  );

  it("goes to the research team before the table or the model sees it, and maps to needs a clinician", () => {
    const c = crit("i11", "inclusion", I11);
    const g = permissionGuard([c]);
    expect(g.criteria[0]).toMatchObject({ askable: false, not_askable_reason: "a permission, not a requirement" });
    expect(g.sent).toEqual([{ criterion_id: "i11", guard: "permission", reason: "a permission, not a requirement" }]);
    expect(applyMustAsk([c]).questions).toEqual([]);
    // The production q6 for it, if it ever came back, could not give met or not met.
    const q6 = yesNo("q6", "Do you have a feeding tube?", "i11");
    const rows = mapDeterministic(g.criteria, [q6], { q6: "no" }).rows;
    expect(rows[0].state).toBe("needs_clinician");
  });
});

describe("guard 3: a time window takes a number question (the q9 case)", () => {
  it.each([
    [WASHOUT[0], WASHOUT_PARENT],
    [WASHOUT[3], WASHOUT_PARENT],
    [E9, null],
    ["Major surgical procedure or significant traumatic injury within 4 weeks of the first dose of study intervention", null],
    ["Disease progression ≤ 84 days following the last dose of neo-adjuvant or adjuvant chemotherapy", null],
    ["At least 2 weeks since the last dose of radiotherapy", null],
  ])("a time window: %s", (quote, parent) => {
    expect(isTimeWindow({ quote, parent_quote: parent })).toBe(true);
  });

  it.each([["Male or female and ≥ 18 years of age"], ["Eastern Cooperative Oncology Group (ECOG) performance status of 0 or 1 with a life expectancy of at least 12 weeks"], [E2]])(
    "not a time window: %s",
    (quote) => expect(isTimeWindow({ quote, parent_quote: null })).toBe(false),
  );

  it("a window measured in half-lives (e4, e5) goes to the research team before the model; e6 and e7 stay", () => {
    const criteria = WASHOUT.map((q, k) => crit(`e${k + 4}`, "exclusion", q, WASHOUT_PARENT));
    const g = halfLifeGuard(criteria);
    expect(g.sent).toEqual([
      { criterion_id: "e4", guard: "time_window", reason: "a time window that depends on a medicine's half-life" },
      { criterion_id: "e5", guard: "time_window", reason: "a time window that depends on a medicine's half-life" },
    ]);
    expect(g.criteria.map((c) => c.askable)).toEqual([false, false, true, true]);
    // Production's 606503e wrote "how many days ago" for e4 with 0 to 13 giving not met; with a short
    // half-life the washout may already be over at 10 days, so that answer cannot settle it.
    const q8: Question = {
      id: "q8",
      text: "How many days ago did you last receive chemotherapy, small molecules, or checkpoint inhibitors?",
      type: "number",
      options: null,
      criterion_ids: ["e4"],
      rules: [{ criterion_id: "e4", confirm_answers: [], deny_answers: [], confirm_range: { min: 0, max: 13 }, deny_range: { min: 14, max: null } }],
    };
    expect(mapDeterministic(g.criteria, [q8], { q8: 10 }).rows[0].state).toBe("needs_clinician");
  });

  it("refuses the production q9 (a choice on e4 to e7) and a yes or no, accepts a number question that compares", () => {
    const criteria = WASHOUT.map((q, k) => crit(`e${k + 4}`, "exclusion", q, WASHOUT_PARENT));
    const q9: Question = {
      id: "q9",
      text: "Have you completed the required washout period after any investigational drug, biologic agent, or radiation therapy?",
      type: "choice",
      options: [
        "Yes, for chemotherapeutic agents, small molecules, and checkpoint inhibitors",
        "Yes, for antibody-drug conjugates",
        "Yes, for cell therapies",
        "Yes, for radiation therapy",
        "No",
      ],
      criterion_ids: ["e4", "e5", "e6", "e7"],
      rules: [
        rule("e4", ["Yes, for chemotherapeutic agents, small molecules, and checkpoint inhibitors"], ["No"]),
        rule("e5", ["Yes, for antibody-drug conjugates"], ["No"]),
        rule("e6", ["Yes, for cell therapies"], ["No"]),
        rule("e7", ["Yes, for radiation therapy"], ["No"]),
      ],
    };
    expect(ruleRejections(q9, criteria).map((r) => [r.criterion_id, r.guard])).toEqual([
      ["e4", "time_window"],
      ["e5", "time_window"],
      ["e6", "time_window"],
      ["e7", "time_window"],
    ]);
    expect(ruleRejections(yesNo("q1", "Have you had radiation therapy in the past 2 weeks?", "e7"), criteria)[0].guard).toBe("time_window");
    const weeks: Question = {
      id: "q1",
      text: "How many weeks ago did you last have radiation therapy?",
      type: "number",
      options: null,
      criterion_ids: ["e7"],
      rules: [{ criterion_id: "e7", confirm_answers: [], deny_answers: [], confirm_range: { min: 0, max: 1.99 }, deny_range: { min: 2, max: null } }],
    };
    expect(ruleRejections(weeks, criteria)).toEqual([]);
  });
});

describe("guard 1: one polarity for every model yes or no rule", () => {
  const e2 = crit("e2", "exclusion", E2);
  const i1 = crit("i1", "inclusion", "Able to swallow tablets");

  it("the allowed shape: yes confirms, no denies, or either settles nothing", () => {
    expect(ruleRejections(yesNo("q1", "Have you ever had a severe allergic reaction to cetuximab?", "e2"), [e2])).toEqual([]);
    expect(ruleRejections(yesNo("q1", "Have you ever had a severe allergic reaction to cetuximab?", "e2", [], ["no"]), [e2])).toEqual([]);
    expect(ruleRejections(yesNo("q1", "Can you swallow tablets?", "i1", ["yes"], []), [i1])).toEqual([]);
    // Read with the section: inclusion yes gives met and no gives not met; exclusion yes gives not met and no gives met.
    const qs = [yesNo("q1", "Can you swallow tablets?", "i1"), yesNo("q2", "Have you ever had a severe allergic reaction to cetuximab?", "e2")];
    const state = (a: string) => mapDeterministic([i1, e2], qs, { q1: a, q2: a }).rows.map((r) => r.state);
    expect(state("yes")).toEqual(["met", "not_met"]);
    expect(state("no")).toEqual(["not_met", "met"]);
  });

  it("refuses the other way round", () => {
    const flipped = yesNo("q1", "Have you ever had a severe allergic reaction to cetuximab?", "e2", ["no"], ["yes"]);
    expect(ruleRejections(flipped, [e2])).toMatchObject([{ criterion_id: "e2", guard: "polarity" }]);
    expect(ruleRejections(yesNo("q1", "Can you swallow tablets?", "i1", [], ["yes"]), [i1])).toHaveLength(1);
  });

  it.each([
    ["Have you never had a severe allergic reaction to cetuximab?"],
    ["Are you not allergic to cetuximab?"],
    ["Is it true you haven't had a reaction to cetuximab?"],
    ["Have you been without allergic reactions to cetuximab?"],
    ["Are you no longer allergic to cetuximab?"],
  ])("refuses a negative stem: %s", (text) => {
    expect(NEGATIVE_STEM_RE.test(text)).toBe(true);
    expect(ruleRejections(yesNo("q1", text, "e2"), [e2])[0].problem).toContain("ask it affirmatively");
  });

  it("holds a yes or no choice to the same rule, and leaves other choices alone", () => {
    const yn: Question = {
      id: "q1",
      text: "Have you ever had a severe allergic reaction to cetuximab?",
      type: "choice",
      options: ["Yes, a severe one", "No"],
      criterion_ids: ["e2"],
      rules: [rule("e2", ["No"], ["Yes, a severe one"])],
    };
    expect(ruleRejections(yn, [e2])).toHaveLength(1);
    const other: Question = { ...yn, options: ["Mild", "Severe", "Never had one"], rules: [rule("e2", ["Severe"], ["Never had one"])] };
    expect(ruleRejections(other, [e2])).toEqual([]);
  });

  it("re-asks once for that criterion only, keeps a fixed answer, and sends a second failure to the research team", async () => {
    const criteria = [i1, e2];
    const flippedE2 = yesNo("q2", "Have you ever had a severe allergic reaction to cetuximab?", "e2", ["no"], ["yes"]);
    const negativeI1 = yesNo("q1", "Is it true you cannot swallow tablets?", "i1");
    const fixedE2 = yesNo("q1", "Have you ever had a severe allergic reaction to cetuximab?", "e2");
    const stillNegative = yesNo("q1", "Are you unable to swallow, or can you not swallow tablets?", "i1");
    // Two questions are under the 8 minimum, so the set's own re-ask runs first, as it always has.
    const llm = fakeLlm([{ questions: [negativeI1, flippedE2] }, { questions: [negativeI1, flippedE2] }, { questions: [stillNegative] }, { questions: [fixedE2] }]);
    const out = await writeQuestions(criteria, llm);
    expect(llm.calls.map((c) => c.label)).toEqual(["questions", "questions re-ask", "questions re-ask i1", "questions re-ask e2"]);
    // The per-criterion re-ask names only its criterion and says how to ask.
    const i1Ask = llm.calls[2].messages.map((m) => m.content).join("\n");
    expect(i1Ask).toContain("Write exactly one question that covers only i1. Ask it affirmatively");
    expect(i1Ask).not.toContain("cetuximab");
    expect(out.report.rejected_rules?.map((r) => [r.criterion_id, r.guard])).toEqual([
      ["i1", "polarity"],
      ["e2", "polarity"],
    ]);
    expect(out.report.reasked_criteria).toEqual([
      { criterion_id: "i1", passed: false },
      { criterion_id: "e2", passed: true },
    ]);
    expect(out.questions.map((q) => [q.id, q.text, q.criterion_ids.join()])).toEqual([["q1", fixedE2.text, "e2"]]);
    expect(out.report.research_team).toEqual([{ criterion_id: "i1", guard: "polarity", reason: "the answer alone cannot settle it" }]);
    expect(out.criteria.find((c) => c.id === "i1")).toMatchObject({ askable: false, not_askable_reason: "the answer alone cannot settle it" });
    const rows = mapDeterministic(out.criteria, out.questions, { q1: "yes" }).rows;
    expect(rows.map((r) => [r.criterion_id, r.state])).toEqual([
      ["i1", "needs_clinician"],
      ["e2", "not_met"],
    ]);
  });
});

describe("NCT06064877 end to end, with the production model's own questions", () => {
  // The split as production stored it: 26 criteria, 14 a patient can answer.
  const ASKABLE = new Set(["i1", "i5", "i9", "i10", "i11", "e1", "e2", "e4", "e5", "e6", "e7", "e9", "e11", "e14"]);
  function split(): Criterion[] {
    let i = 0;
    let e = 0;
    const out: Criterion[] = [];
    for (const l of LINES) {
      if (l.line === WASHOUT_PARENT) continue;
      const id = l.section === "inclusion" ? `i${++i}` : `e${++e}`;
      const parent = WASHOUT.includes(l.line) ? WASHOUT_PARENT : null;
      const askable = ASKABLE.has(id);
      out.push({ id, section: l.section, quote: l.line, parent_quote: parent, askable, not_askable_reason: askable ? null : "needs a clinician's judgment" });
    }
    return out;
  }

  // The first production run's q7, q8, q9 and q10 (q6, the feeding tube, cannot come back: i11 never
  // reaches the model; e4 and e5, measured in half-lives, do not either, so q9 is left with e6 and e7).
  const MODEL: Question[] = [
    yesNo("q1", "Have you had more than 2 prior lines of anticancer therapy or treatment with cetuximab or other EGFR inhibitors for R/M HNSCC?", "e1"),
    yesNo("q2", "Have you ever had a severe allergic reaction to recombinant proteins or excipients in the investigational agent or cetuximab?", "e2"),
    {
      id: "q3",
      text: "Have you completed the required washout period after any investigational drug, biologic agent, or radiation therapy?",
      type: "choice",
      options: ["Yes, for cell therapies", "Yes, for radiation therapy", "No"],
      criterion_ids: ["e6", "e7"],
      rules: [rule("e6", ["Yes, for cell therapies"], ["No"]), rule("e7", ["Yes, for radiation therapy"], ["No"])],
    },
    yesNo("q4", "Do you have any significant heart problems, such as heart failure, recent heart attack, or serious heart rhythm issues?", "e9"),
  ];
  const STILL_YES_NO = (id: string) => ({ questions: [yesNo("q1", "Have you had this in the time before the first dose?", id)] });

  it("sends i11, i9, e4 to e7 and e9 to the research team, keeps the rest, and writes the summary line", async () => {
    expect(split()).toHaveLength(26);
    const llm = fakeLlm([{ criteria: split() }, { questions: MODEL }, STILL_YES_NO("e6"), STILL_YES_NO("e7"), STILL_YES_NO("e9")]);
    const out = await generateForTrial(TEXT, llm);
    expect(llm.calls.map((c) => c.label)).toEqual(["criteria", "questions", "questions re-ask e6", "questions re-ask e7", "questions re-ask e9"]);
    // The model never sees the permission or the half-life windows.
    const sent = llm.calls[1].messages[1].content;
    expect(sent).not.toContain("feeding tubes");
    expect(sent).not.toContain("half-lives");
    expect(out.questions.map((q) => [q.id, q.criterion_ids.join()])).toEqual([
      ["q1", "i1"],
      ["q2", "i5"],
      ["q3", "i10"],
      ["q4", "e11"],
      ["q5", "e14"],
      ["q6", "e1"],
      ["q7", "e2"],
    ]);
    expect(out.report.questions.rejected_rules?.map((r) => r.criterion_id)).toEqual(["e6", "e7", "e9"]);
    expect(out.report.research_team?.map((r) => [r.criterion_id, r.guard])).toEqual([
      ["i11", "permission"],
      ["e4", "time_window"],
      ["e5", "time_window"],
      ["e6", "time_window"],
      ["e7", "time_window"],
      ["e9", "time_window"],
      ["i9", "time_window"],
    ]);
    for (const id of ["i9", "i11", "e4", "e5", "e6", "e7", "e9"]) expect(out.criteria.find((c) => c.id === id)?.askable, id).toBe(false);

    const line = guardSummaryText(out.report);
    expect(line).toBe("7 questions written, 7 criteria sent to the research team because the answer alone cannot settle them.");
    expect(rejectedRulesText(out.report.questions)).toBe(
      "3 model rules refused by the polarity and time-window checks; 3 criteria re-asked once, 0 passed the second time.",
    );
    const html = renderToStaticMarkup(<GenerationSummary report={out.report} criteria={out.criteria} />);
    expect(html).toContain(line!);
    expect(html).toContain("data-rejected-rules");
    expect(findVerdictWord(html)).toBeNull();
    expect(hasEmDash(html)).toBe(false);
  });

  it("singular forms, and nothing for a trial generated before the guards", () => {
    expect(guardSummaryText({ questions: { kept: 1 }, research_team: [{ criterion_id: "i1", guard: "permission", reason: "x" }] })).toBe(
      "1 question written, 1 criterion sent to the research team because the answer alone cannot settle it.",
    );
    expect(guardSummaryText({ questions: { kept: 12 } })).toBeNull();
    expect(rejectedRulesText({ rejected_rules: [] })).toBeNull();
  });
});
