import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import StateCell from "@/components/StateCell";
import CriteriaMatrix from "@/components/CriteriaMatrix";
import CountsLine from "@/components/CountsLine";
import KarmaButton from "@/components/KarmaButton";
import MapFooter from "@/components/MapFooter";
import { mapDeterministic } from "@/lib/mapping";
import { FOOTER_TEXT, findVerdictWord, hasEmDash } from "@/lib/wording";
import type { Criterion, Question } from "@/lib/types";

const FIX = JSON.parse(readFileSync(join(__dirname, "fixtures", "NCT06380751.generated.json"), "utf8")) as {
  criteria: Criterion[];
  questions: Question[];
};

/** The escaping React applies to text content. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

describe("rendered UI", () => {
  it("StateCell shows colour, icon and word for each state", () => {
    const met = renderToStaticMarkup(<StateCell state="met" />);
    expect(met).toContain("✓");
    expect(met).toContain(">met<");
    expect(met).toContain("bg-state-met-tint");
    expect(renderToStaticMarkup(<StateCell state="not_met" />)).toContain("not met");
    expect(renderToStaticMarkup(<StateCell state="not_found" />)).toContain("not found");
    expect(renderToStaticMarkup(<StateCell state="needs_clinician" />)).toContain("needs a clinician");
  });

  it("the matrix has one row and one data-state cell per criterion, each quoting its source", () => {
    const { rows } = mapDeterministic(FIX.criteria, FIX.questions, { q1: "Adult male", q4: "yes", q7: "no" });
    const html = renderToStaticMarkup(<CriteriaMatrix rows={rows} criteria={FIX.criteria} questions={FIX.questions} />);
    expect(html.match(/data-criterion-id=/g)).toHaveLength(FIX.criteria.length);
    expect(html.match(/data-state=/g)).toHaveLength(FIX.criteria.length);
    expect(html).toContain('data-state="met"');
    expect(html).toContain('data-state="not_met"');
    expect(html).toContain("“Adult male”");
    for (const c of FIX.criteria) expect(html).toContain(escapeHtml(c.quote));
  });

  it("counts line, Karma button and footer render as specified", () => {
    const { rows } = mapDeterministic(FIX.criteria, FIX.questions, {});
    expect(renderToStaticMarkup(<CountsLine rows={rows} />)).toContain("0 met · 0 not met · 19 not found · 15 need a clinician");
    const k = renderToStaticMarkup(<KarmaButton />);
    expect(k).toContain('disabled=""');
    expect(k).toContain("Request records for a full match");
    expect(k).toContain("coming: Karma");
    expect(renderToStaticMarkup(<MapFooter />)).toContain(FOOTER_TEXT);
  });

  it("generated question text in the fixture is free of verdict words and em dashes", () => {
    for (const q of FIX.questions) {
      expect(findVerdictWord(q.text)).toBeNull();
      expect(hasEmDash(q.text)).toBe(false);
    }
  });
});
