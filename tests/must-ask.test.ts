// The must-ask table (lib/must-ask.ts): every listed phrasing gets its question, the age wordings
// below are copied from ClinicalTrials.gov records, the rules stay conservative, and generation puts
// the table's questions first and lets the model write only the rest.
import { describe, it, expect } from "vitest";
import { MUST_ASK_TABLE, applyMustAsk } from "@/lib/must-ask";
import { generateForTrial, questionProblems, visibleText, writeQuestions } from "@/lib/generate";
import { mapDeterministic } from "@/lib/mapping";
import type { JsonCall, JsonResult, LlmJson } from "@/lib/openai";
import type { Criterion, Question, Section } from "@/lib/types";
import { hasEmDash, findVerdictWord } from "@/lib/wording";

function crit(id: string, section: Section, quote: string, askable = false): Criterion {
  return { id, section, quote: visibleText(quote), parent_quote: null, askable, not_askable_reason: askable ? null : "needs a clinician's judgment" };
}

/** The one table question for a single criterion, or null. */
function askFor(section: Section, quote: string): Question | null {
  const r = applyMustAsk([crit(section === "inclusion" ? "i1" : "e1", section, quote)]);
  return r.questions[0] ?? null;
}

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

describe("the table", () => {
  it("covers the eight facts, each with at least two registry phrasings", () => {
    expect(MUST_ASK_TABLE.map((e) => e.kind).sort()).toEqual(
      ["age", "attend_visits", "current_medication", "menopause", "other_cancer", "pregnancy", "prior_treatment", "sex"].sort(),
    );
    for (const e of MUST_ASK_TABLE) expect(e.phrasings.length, e.kind).toBeGreaterThanOrEqual(2);
  });

  for (const entry of MUST_ASK_TABLE) {
    it.each(entry.phrasings.map((p) => [p]))(`${entry.kind}: "%s" is recognised and asked`, (phrasing) => {
      expect(entry.patterns.some((p) => p.test(phrasing))).toBe(true);
      const id = entry.usual === "inclusion" ? "i1" : "e1";
      const r = applyMustAsk([crit(id, entry.usual, phrasing)]);
      expect(r.questions).toHaveLength(1);
      const q = r.questions[0];
      expect(q.criterion_ids).toEqual([id]);
      expect(r.criteria[0].askable).toBe(true);
      expect(r.tags).toEqual([{ criterion_id: id, kind: expect.any(String), question_id: "q1", made_askable: true }]);
      // Plain, one fact, answerable yes / no / not sure or with a number; passes every question check.
      expect(["yes_no", "number"]).toContain(q.type);
      expect(questionProblems(q, r.criteria)).toEqual([]);
      expect(findVerdictWord(q.text)).toBeNull();
      expect(hasEmDash(q.text)).toBe(false);
    });
  }
});

describe("age criteria as ClinicalTrials.gov words them", () => {
  const yesNo = (text: string) => ({ text, type: "yes_no", confirm: ["yes"], deny: ["no"] });
  const cases: [string, string, { text: string; type: string; confirm: unknown; deny: unknown }][] = [
    ["NCT05201404", "Males and females at least 18 years of age.", yesNo("Are you 18 or older?")],
    ["NCT06463587", "Adults of ≥ 18 years of age at the time of signing the informed consent.", yesNo("Are you 18 or older?")],
    ["NCT06499285", "Male or female greater than or equal to (≥)18 years of age at the time of signing informed consent.", yesNo("Are you 18 or older?")],
    ["NCT06064877", "Male or female and ≥ 18 years of age", yesNo("Are you 18 or older?")],
    ["NCT05774951", "Women and Men, ≥18 years at the time of screening (or per national guidelines)", yesNo("Are you 18 or older?")],
    ["NCT06380751", "Adult females, pre/peri-menopausal and/or post-menopausal, and adult males", yesNo("Are you 18 or older?")],
    ["NCT06819007", "Adults ≥18 years of age on the day of signing the ICF. Follow local regulatory requirements if the legal age of consent for trial participation is \\>18 years", yesNo("Are you 18 or older?")],
    ["NCT04892173", "Age greater than or equal to (\\>=) 60 years old", yesNo("Are you 60 or older?")],
    ["NCT07099898", "Adults \\>18 or the minimum legal adult age at the time the informed consent form is signed", yesNo("Are you older than 18?")],
    ["NCT07028853", "Male participants aged ≥18 years (or the minimum age of consent in accordance with local regulations) at screening.", yesNo("Are you a man aged 18 or older?")],
    [
      "NCT07250750",
      "Male or female aged ≥ 18 years and \\< 75 years",
      { text: "How old are you? Answer in years.", type: "number", confirm: { min: 18, max: 74 }, deny: { min: 75, max: null } },
    ],
  ];

  it.each(cases)("%s: %s", (_nct, quote, want) => {
    const q = askFor("inclusion", quote);
    expect(q).not.toBeNull();
    expect(q!.text).toBe(want.text);
    expect(q!.type).toBe(want.type);
    const r = q!.rules[0];
    if (want.type === "number") {
      expect(r.confirm_range).toEqual(want.confirm);
      expect(r.deny_range).toEqual(want.deny);
    } else {
      expect(r.confirm_answers).toEqual(want.confirm);
      expect(r.deny_answers).toEqual(want.deny);
    }
  });

  it("an age range maps in code: inside met, above it not met, below it not found", () => {
    const r = applyMustAsk([crit("i1", "inclusion", "Male or female aged ≥ 18 years and \\< 75 years")]);
    const state = (age: number) => mapDeterministic(r.criteria, r.questions, { q1: age }).rows[0].state;
    expect(state(40)).toBe("met");
    expect(state(80)).toBe("not_met");
    expect(state(16)).toBe("not_found");
  });

  it("ignores ages given as examples and conflicting ages", () => {
    expect(askFor("inclusion", "Participants not suitable for induction therapy (e.g., age \\>75 years, ECOG 2)")).toBeNull();
    expect(askFor("inclusion", "Aged 70-74 years old with a Geriatric 8 result of 14 or less, or Aged \\>= 75 years old")).toBeNull();
  });

  it("folds sex and menopause into the one question", () => {
    expect(askFor("inclusion", "Postmenopausal women aged ≥ 18 years")?.text).toBe("Are you a woman aged 18 or older who has been through the menopause?");
    expect(askFor("inclusion", "Female patients")?.text).toBe("Are you a woman?");
  });
});

describe("conservative rules", () => {
  it("another cancer with exceptions: only no settles it", () => {
    const q = askFor(
      "exclusion",
      "History of prior malignancy within 2 years prior to randomization (except for adequately treated non-melanoma skin cancer, carcinoma in situ of the breast or cervix)",
    )!;
    expect(q.text).toBe("Apart from the cancer you have now, have you had another cancer in the past 2 years?");
    expect(q.rules[0].confirm_answers).toEqual([]);
    expect(q.rules[0].deny_answers).toEqual(["no"]);
  });

  it("another cancer as one of several exclusions: yes settles it, no does not", () => {
    const q = askFor("exclusion", "History of malignant thymoma, or history of cancer within the past 5 years of screening")!;
    expect(q.text).toBe("Have you had cancer in the past 5 years?");
    expect(q.rules[0]).toMatchObject({ confirm_answers: ["yes"], deny_answers: [] });
  });

  it("current medicines: a wider question, so only no settles it; a half-life window is left to the model", () => {
    const q = askFor("exclusion", "Concomitant use of strong CYP3A4 inhibitors")!;
    expect(q.text).toBe("Are you taking or receiving any medicines or treatments at the moment, including supplements?");
    expect(q.rules[0]).toMatchObject({ confirm_answers: [], deny_answers: ["no"] });
    const r = applyMustAsk([crit("e1", "exclusion", "Concomitant use of the following types of medications within 21 days or at least 5 half-lives of randomisation")]);
    expect(r.questions).toEqual([]);
    expect(r.tags[0]).toMatchObject({ question_id: null, kind: "current_medication" });
    expect(r.criteria[0].askable).toBe(false);
  });

  it("prior treatment: names the drug, reads a negation, skips a permission", () => {
    const q = askFor("exclusion", "Previous treatment with camizestrant, investigational SERDs/investigational ER targeting agents, or fulvestrant")!;
    expect(q.text).toBe("Have you ever been treated with camizestrant, investigational SERDs/investigational ER targeting agents, or fulvestrant?");
    expect(q.rules[0]).toMatchObject({ confirm_answers: ["yes"], deny_answers: ["no"] });
    const not = askFor("inclusion", "Advanced or unresectable HCC not previously treated with systemic therapy")!;
    expect(not.rules[0]).toMatchObject({ confirm_answers: [], deny_answers: ["yes"] });
    expect(askFor("inclusion", "May have received PD-(L)1 monoclonal antibody")).toBeNull();
    expect(askFor("exclusion", "Has been treated with any complement inhibitor, but failed due to intolerability or lack of efficacy")).toBeNull();
  });

  it("pregnancy tests and contraception are not the pregnancy question, and do not ask for a sex", () => {
    expect(askFor("inclusion", "For women of childbearing potential (WOCBP), documentation of negative serum pregnancy test within 30 days of randomization")).toBeNull();
    expect(askFor("inclusion", "Women of childbearing potential must agree to use a highly effective method of contraception")).toBeNull();
  });

  it("visits: an inclusion that asks for more than visits is settled only by no", () => {
    const q = askFor("inclusion", "Ability to give written informed consent and comply with protocol requirements")!;
    expect(q.text).toBe("Would you be able to come to the trial site for regular visits during the trial?");
    expect(q.rules[0]).toMatchObject({ confirm_answers: [], deny_answers: ["no"] });
  });

  it("one yes never confirms two criteria of one question", () => {
    const r = applyMustAsk([crit("i1", "inclusion", "Subjects aged ≥18 years"), crit("i2", "inclusion", "Subjects aged ≥18 years")]);
    expect(r.questions).toHaveLength(1);
    expect(r.questions[0].rules.map((x) => x.confirm_answers)).toEqual([["yes"], []]);
    expect(questionProblems(r.questions[0], r.criteria)).toEqual([]);
  });
});

describe("generation with the table", () => {
  const TEXT = [
    "Inclusion Criteria:",
    "",
    "* Male or female and ≥ 18 years of age",
    "* Histologically confirmed squamous cell carcinoma",
    "* Able to swallow tablets",
    "",
    "Exclusion Criteria:",
    "",
    "* Female participants who are pregnant or breastfeeding",
    "* Known hepatitis B infection",
    "* Fictional condition number one",
  ].join("\n");

  const split: Criterion[] = [
    // The split marks age as not patient-answerable: the table asks it anyway.
    { id: "i1", section: "inclusion", quote: "Male or female and ≥ 18 years of age", parent_quote: null, askable: false, not_askable_reason: "needs records" },
    { id: "i2", section: "inclusion", quote: "Histologically confirmed squamous cell carcinoma", parent_quote: null, askable: false, not_askable_reason: "needs pathology" },
    { id: "i3", section: "inclusion", quote: "Able to swallow tablets", parent_quote: null, askable: true, not_askable_reason: null },
    { id: "e1", section: "exclusion", quote: "Female participants who are pregnant or breastfeeding", parent_quote: null, askable: true, not_askable_reason: null },
    { id: "e2", section: "exclusion", quote: "Known hepatitis B infection", parent_quote: null, askable: true, not_askable_reason: null },
    { id: "e3", section: "exclusion", quote: "Fictional condition number one", parent_quote: null, askable: true, not_askable_reason: null },
  ];

  const modelQs: Question[] = [
    { id: "q1", text: "Can you swallow tablets?", type: "yes_no", options: null, criterion_ids: ["i3"], rules: [{ criterion_id: "i3", confirm_answers: ["yes"], deny_answers: ["no"], confirm_range: null, deny_range: null }] },
    { id: "q2", text: "Have you been told you have hepatitis B?", type: "yes_no", options: null, criterion_ids: ["e2"], rules: [{ criterion_id: "e2", confirm_answers: [], deny_answers: ["no"], confirm_range: null, deny_range: null }] },
    { id: "q3", text: "Do you have fictional condition number one?", type: "yes_no", options: null, criterion_ids: ["e3"], rules: [{ criterion_id: "e3", confirm_answers: ["yes"], deny_answers: ["no"], confirm_range: null, deny_range: null }] },
  ];

  it("asks the table's questions first, makes the age criterion askable, and the model writes only the rest", async () => {
    const llm = fakeLlm([{ criteria: split }, { questions: modelQs }]);
    const out = await generateForTrial(TEXT, llm);
    expect(llm.calls.map((c) => c.label)).toEqual(["criteria", "questions"]);
    const sent = llm.calls[1].messages[1].content;
    expect(sent).toContain("Able to swallow tablets");
    expect(sent).not.toContain("18 years of age");
    expect(sent).not.toContain("pregnant");
    // 2 table questions, so the model is asked for between 3 and 10.
    expect(llm.calls[1].messages[0].content).toContain("Write between 3 and 10 questions");
    expect(out.questions.map((q) => [q.id, q.text, q.criterion_ids.join()])).toEqual([
      ["q1", "Are you 18 or older?", "i1"],
      ["q2", "Are you pregnant or breastfeeding at the moment?", "e1"],
      ["q3", "Can you swallow tablets?", "i3"],
      ["q4", "Have you been told you have hepatitis B?", "e2"],
      ["q5", "Do you have fictional condition number one?", "e3"],
    ]);
    expect(out.criteria.find((c) => c.id === "i1")).toMatchObject({ askable: true, not_askable_reason: null });
    expect(out.criteria.find((c) => c.id === "i2")).toMatchObject({ askable: false });
    expect(out.report.questions.must_ask).toEqual([
      { criterion_id: "i1", kind: "age", question_id: "q1", made_askable: true },
      { criterion_id: "e1", kind: "pregnancy", question_id: "q2", made_askable: false },
    ]);
    expect(out.report.questions.askable_without_question).toEqual([]);
    // A man under 18 and a pregnant woman map in code, from the table's rules.
    const rows = mapDeterministic(out.criteria, out.questions, { q1: "no", q2: "yes" }).rows;
    expect(rows.find((r) => r.criterion_id === "i1")?.state).toBe("not_met");
    expect(rows.find((r) => r.criterion_id === "e1")?.state).toBe("not_met");
  });

  it("a model question that serves a criterion the table already asks is re-asked", async () => {
    const must = applyMustAsk(split);
    const twice: Question = { ...modelQs[0], id: "q4", text: "Are you an adult?", criterion_ids: ["i1"], rules: [{ ...modelQs[0].rules[0], criterion_id: "i1" }] };
    const llm = fakeLlm([{ questions: [...modelQs, twice] }, { questions: modelQs }]);
    const { questions, report } = await writeQuestions(must.criteria, llm, undefined, must.questions);
    expect(report.first_problems).toContain("q4: serves unknown criterion i1");
    expect(questions.map((q) => q.id)).toEqual(["q1", "q2", "q3", "q4", "q5"]);
  });

  it("without table questions, the prompt and ids are as before", async () => {
    // Three questions are under 8, so the count re-ask happens as it always did.
    const llm = fakeLlm([{ questions: modelQs }, { questions: modelQs }]);
    const { questions, report } = await writeQuestions(split.filter((c) => c.id !== "i1" && c.id !== "e1"), llm);
    expect(llm.calls[0].messages[0].content).toContain("Write between 8 and 12 questions");
    expect(report.first_problems).toContain("there are 3 questions; write between 8 and 12");
    expect(questions.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
  });
});
