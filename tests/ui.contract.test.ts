// UI contract that restyling must keep: StateCell is the only renderer of a state,
// the data-* hooks exist, and the fixed copy is exact.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { FOOTER_TEXT } from "@/lib/wording";
import { CONFIRMATION_TEXT } from "@/components/PublicForm";

const ROOT = join(__dirname, "..");

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) tsxFiles(abs, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(relative(ROOT, abs).split("\\").join("/"));
  }
  return out;
}

const UI = [...tsxFiles(join(ROOT, "app")), ...tsxFiles(join(ROOT, "components"))].filter((f) => !f.startsWith("app/api/"));
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");

describe("StateCell is the only place a criterion state is rendered", () => {
  it("no other UI file uses STATE_LABEL or spells a state label", () => {
    const offenders: string[] = [];
    for (const f of UI) {
      if (f === "components/StateCell.tsx") continue;
      const text = read(f);
      if (/STATE_LABEL/.test(text)) offenders.push(`${f}: STATE_LABEL`);
      for (const label of ["not met", "not found", "needs a clinician"]) {
        if (text.toLowerCase().includes(label)) offenders.push(`${f}: "${label}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("StateCell renders from STATE_LABEL", () => {
    expect(read("components/StateCell.tsx")).toContain("STATE_LABEL[state]");
  });
});

describe("stable data-* hooks", () => {
  const hooks: [string, string][] = [
    ["components/NewTrial.tsx", "data-nct-input"],
    ["components/PublishPanel.tsx", "data-publish"],
    ["components/CriteriaChecklist.tsx", "data-criterion-id"],
    ["components/CriteriaMatrix.tsx", "data-criterion-id"],
    ["components/QuestionList.tsx", "data-question-id"],
    ["components/QuestionField.tsx", "data-question-id"],
    ["components/PublicForm.tsx", "data-submit"],
    ["components/InboxTable.tsx", "data-submission-id"],
    ["components/CriteriaMatrix.tsx", "data-state"],
  ];
  it.each(hooks)("%s keeps %s", (file, hook) => {
    expect(read(file)).toContain(hook);
  });
});

describe("fixed copy", () => {
  it("Karma button: disabled, exact label and caption", () => {
    const k = read("components/KarmaButton.tsx");
    expect(k).toContain("Request records for a full match");
    expect(k).toContain("coming: Karma");
    expect(k).toMatch(/\bdisabled\b/);
    expect(k).not.toMatch(/onClick|fetch\(|href=/);
  });

  it("footer and confirmation text are exact", () => {
    expect(FOOTER_TEXT).toBe("A criteria map, not an eligibility decision. Every line quotes its source.");
    expect(read("components/MapFooter.tsx")).toContain("{FOOTER_TEXT}");
    expect(CONFIRMATION_TEXT).toBe("Thank you. The research team will contact you.");
  });

  it("the public form shows nothing but the confirmation after submit", () => {
    const f = read("components/PublicForm.tsx");
    const doneBlock = f.slice(f.indexOf("if (done)"), f.indexOf("return (\n    <form"));
    expect(doneBlock).toContain("{CONFIRMATION_TEXT}");
    expect(doneBlock).not.toMatch(/answers|rows|state/);
  });

  it("the submit API returns only ok", () => {
    const r = read("app/api/s/[slug]/submit/route.ts");
    expect(r).toContain("Response.json({ ok: true })");
    expect(r).not.toMatch(/rows|mapping|state/);
  });
});
