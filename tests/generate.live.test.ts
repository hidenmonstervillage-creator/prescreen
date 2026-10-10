// Live generation against gpt-4o on the NCT06380751 fixture. Skipped unless LIVE=1.
// WRITE_FIXTURE=1 also freezes the output to tests/fixtures/NCT06380751.generated.json,
// which tests/mapping.test.ts reads.
import { describe, it, expect } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateForTrial, isVerbatim, questionProblems, MIN_QUESTIONS, MAX_QUESTIONS } from "@/lib/generate";
import { wordingProblems } from "@/lib/wording";

const FIX = join(__dirname, "fixtures");
const TEXT = readFileSync(join(FIX, "NCT06380751.criteria.md"), "utf8");

describe.skipIf(process.env.LIVE !== "1")("generation live (gpt-4o)", () => {
  it("splits criteria and writes questions that pass every check", async () => {
    const { criteria, questions, report } = await generateForTrial(TEXT);
    // Full output for inspection, kept out of git (reports/ is ignored).
    mkdirSync(join(__dirname, "..", "reports", "A1"), { recursive: true });
    writeFileSync(
      join(__dirname, "..", "reports", "A1", "generate-live.json"),
      JSON.stringify({ criteria, questions, report }, null, 2),
      "utf8",
    );

    expect(criteria.length).toBeGreaterThanOrEqual(15);
    for (const c of criteria) {
      expect(isVerbatim(c.quote, TEXT), c.id).toBe(true);
      if (c.parent_quote) expect(isVerbatim(c.parent_quote, TEXT), c.id).toBe(true);
      expect(wordingProblems(c.not_askable_reason ?? "")).toEqual([]);
    }
    expect(questions.length).toBeGreaterThanOrEqual(MIN_QUESTIONS);
    expect(questions.length).toBeLessThanOrEqual(MAX_QUESTIONS);
    for (const q of questions) expect(questionProblems(q, criteria), q.id).toEqual([]);

    if (process.env.WRITE_FIXTURE === "1") {
      writeFileSync(
        join(FIX, "NCT06380751.generated.json"),
        JSON.stringify({ nct_id: "NCT06380751", criteria, questions, report }, null, 2) + "\n",
        "utf8",
      );
    }
  }, 300_000);
});
