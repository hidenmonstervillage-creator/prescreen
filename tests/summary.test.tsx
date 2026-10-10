// The summary sentence (lib/summary.ts): both shapes exactly, from the NCT06380751 fixture's own
// mapping for demo rows A and C, rendered under the map and in the pack preview. No percentage,
// no verdict word.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import SummaryCard from "@/components/SummaryCard";
import { mapDeterministic } from "@/lib/mapping";
import { countsLine } from "@/lib/states";
import { summaryText } from "@/lib/summary";
import { findVerdictWord, hasEmDash } from "@/lib/wording";
import type { Answers, Criterion, MappingRow, Question, State } from "@/lib/types";

const FIX = JSON.parse(readFileSync(join(__dirname, "fixtures", "NCT06380751.generated.json"), "utf8")) as {
  criteria: Criterion[];
  questions: Question[];
};

// Row A: all 12 answered, post-menopausal woman, q2 yes, q3 to q12 no. Row C: as A, but q11 tuberculosis yes.
const A: Answers = { q1: "Adult female, post-menopausal", q2: "yes" };
for (let k = 3; k <= 12; k++) A[`q${k}`] = "no";
const C: Answers = { ...A, q11: "yes" };

function rows(spec: [string, State][]): Pick<MappingRow, "criterion_id" | "state">[] {
  return spec.map(([criterion_id, state]) => ({ criterion_id, state }));
}

const BANNED = /\b(?:in)?eligib\w*|\bqualif\w*|\b\w*likel\w*|\bscor\w*|\bfits?\b|\bprobab\w*|%|\bpercent\w*/i;

describe("summary sentence", () => {
  it("row A: the referral-ready shape", () => {
    const r = mapDeterministic(FIX.criteria, FIX.questions, A).rows;
    expect(countsLine(r)).toBe("12 met · 0 not met · 7 not found · 15 need a clinician");
    expect(summaryText(r)).toBe(
      "Referral-ready. 12 of 19 patient-answerable criteria met, 0 contradicted, 7 to confirm at the trial site. 15 criteria are for the research team.",
    );
  });

  it("row C: the not referral-ready shape, naming the contradicted criterion", () => {
    const r = mapDeterministic(FIX.criteria, FIX.questions, C).rows;
    expect(countsLine(r)).toBe("11 met · 1 not met · 7 not found · 15 need a clinician");
    expect(summaryText(r)).toBe("Not referral-ready: 1 criterion contradicted (e11). 11 met, 7 to confirm. 15 criteria are for the research team.");
  });

  it("the shapes as written in the brief, and the plural and singular forms", () => {
    const notReady = rows([
      ...Array.from({ length: 11 }, (_, k): [string, State] => [`i${k + 1}`, "met"]),
      ["e6", "not_met"],
      ...Array.from({ length: 7 }, (_, k): [string, State] => [`e${k + 10}`, "not_found"]),
      ...Array.from({ length: 15 }, (_, k): [string, State] => [`e${k + 20}`, "needs_clinician"]),
    ]);
    expect(summaryText(notReady)).toBe("Not referral-ready: 1 criterion contradicted (e6). 11 met, 7 to confirm. 15 criteria are for the research team.");
    expect(summaryText(rows([["e6", "not_met"], ["e11", "not_met"], ["i1", "needs_clinician"]]))).toBe(
      "Not referral-ready: 2 criteria contradicted (e6, e11). 0 met, 0 to confirm. 1 criterion is for the research team.",
    );
    expect(summaryText(rows([["i1", "met"]]))).toBe(
      "Referral-ready. 1 of 1 patient-answerable criterion met, 0 contradicted, 0 to confirm at the trial site. 0 criteria are for the research team.",
    );
    expect(summaryText([])).toBeNull();
  });

  it("never a percentage or a verdict word", () => {
    for (const answers of [A, C, {}]) {
      const text = summaryText(mapDeterministic(FIX.criteria, FIX.questions, answers).rows) ?? "";
      expect(text.match(BANNED)?.[0] ?? null).toBeNull();
      expect(findVerdictWord(text)).toBeNull();
      expect(hasEmDash(text)).toBe(false);
    }
  });

  it("renders as a card under the map and as a line in the pack preview, with the data-summary hook", () => {
    const r = mapDeterministic(FIX.criteria, FIX.questions, C).rows;
    const card = renderToStaticMarkup(<SummaryCard rows={r} />);
    expect(card).toContain("data-summary");
    expect(card).toContain("Not referral-ready: 1 criterion contradicted (e11).");
    const line = renderToStaticMarkup(<SummaryCard rows={r} look="line" />);
    expect(line).toMatch(/^<p [^>]*data-summary[^>]*>Not referral-ready/);
    expect(renderToStaticMarkup(<SummaryCard rows={[]} />)).toBe("");
  });
});
