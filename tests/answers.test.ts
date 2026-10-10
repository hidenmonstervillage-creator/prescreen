import { describe, it, expect } from "vitest";
import { cleanSubmission } from "@/lib/answers";
import { toPublicQuestion, type Question } from "@/lib/types";

const Q: Question[] = [
  { id: "q1", text: "Yes or no?", type: "yes_no", options: null, criterion_ids: ["e1"], rules: [] },
  { id: "q2", text: "Pick one", type: "choice", options: ["A", "B"], criterion_ids: ["i1"], rules: [] },
  { id: "q3", text: "Age in years?", type: "number", options: null, criterion_ids: ["i2"], rules: [] },
  { id: "q4", text: "Anything else?", type: "free_text", options: null, criterion_ids: ["e2"], rules: [] },
];

describe("cleanSubmission", () => {
  it("keeps valid answers, converts numbers, drops blanks and unknown keys", () => {
    const r = cleanSubmission(Q, {
      answers: { q1: "unsure", q2: "B", q3: "61", q4: "  nothing  ", q9: "x" },
      contact: " Fictional Person, +359 00 000 0000 ",
    });
    expect(r).toEqual({
      ok: true,
      value: { answers: { q1: "unsure", q2: "B", q3: 61, q4: "nothing" }, contact: "Fictional Person, +359 00 000 0000" },
    });
    const blank = cleanSubmission(Q, { answers: { q1: "", q3: "" }, contact: "x" });
    expect(blank).toEqual({ ok: true, value: { answers: {}, contact: "x" } });
  });

  it("refuses answers that are not offered, non-numbers and a missing contact", () => {
    const r = cleanSubmission(Q, { answers: { q1: "maybe", q2: "C", q3: "forty" }, contact: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toEqual([
        "q1: choose yes, no or not sure",
        "q2: choose one of the options",
        "q3: enter a number",
        "contact: tell the research team how to reach you",
      ]);
    }
    expect(cleanSubmission(Q, null).ok).toBe(false);
  });

  it("the public page gets questions without criterion links or rules", () => {
    const p = toPublicQuestion({ ...Q[0], rules: [{ criterion_id: "e1", confirm_answers: ["yes"], deny_answers: ["no"], confirm_range: null, deny_range: null }] });
    expect(Object.keys(p).sort()).toEqual(["id", "options", "text", "type"]);
  });
});
