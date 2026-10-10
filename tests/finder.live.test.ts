// Live plain-word lines from gpt-4o on the NCT06380751 fixture. Skipped unless LIVE=1.
// One model call. Output goes to reports/A2/finder-live.json (reports/ is not in git).
import { describe, it, expect } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseStudy } from "@/lib/ctgov";
import { numberCriteria, writePlainLines } from "@/lib/finder";
import { emptyUsage, openaiJson } from "@/lib/openai";
import { visibleText } from "@/lib/text";
import { wordingProblems } from "@/lib/wording";

const FIX = join(__dirname, "fixtures");
const study = parseStudy(JSON.parse(readFileSync(join(FIX, "NCT06380751.study.json"), "utf8")));

describe.skipIf(process.env.LIVE !== "1")("plain-word lines live (gpt-4o)", () => {
  it("writes lines that pass every check and are not copies of the criterion text", async () => {
    const criteria = numberCriteria(study.criteriaText);
    const usage = emptyUsage();
    const { lines, report } = await writePlainLines(study, criteria, openaiJson, usage, new Date().toISOString());
    mkdirSync(join(__dirname, "..", "reports", "A2"), { recursive: true });
    writeFileSync(join(__dirname, "..", "reports", "A2", "finder-live.json"), JSON.stringify({ lines, report }, null, 2), "utf8");

    expect(usage.calls).toBe(1);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    for (const l of lines) {
      expect(wordingProblems(l.text)).toEqual([]);
      expect(visibleText(study.criteriaText)).toContain(criteria.find((c) => c.id === l.criterion_id)!.quote);
      expect(l.text.toLowerCase().replace(/\W+/g, " ").trim()).not.toBe(l.quote.toLowerCase().replace(/\W+/g, " ").trim());
    }
  }, 120_000);
});
