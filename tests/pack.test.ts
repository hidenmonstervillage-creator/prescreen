// The lead pack PDF: one page per selected patient, each page quoting its sources.
// Built from the NCT06380751 fixture with fictional patients and the real fonts.
// PACK_OUT=<file.pdf> writes the three-patient pack there for a look.
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { buildPackPdf, packFileName, PACK_FONT_FILES, type LeadPack, type PackPatient } from "@/lib/pack";
import { mapDeterministic } from "@/lib/mapping";
import { countsLine } from "@/lib/states";
import { FOOTER_TEXT, PACK_FOOTER_TEXT, findVerdictWord, hasEmDash } from "@/lib/wording";
import type { Answers, Criterion, Question } from "@/lib/types";

const ROOT = join(__dirname, "..");
const FIX = JSON.parse(readFileSync(join(__dirname, "fixtures", "NCT06380751.generated.json"), "utf8")) as {
  criteria: Criterion[];
  questions: Question[];
};
const FONTS = {
  regular: readFileSync(join(ROOT, "public", "fonts", PACK_FONT_FILES.regular)),
  semibold: readFileSync(join(ROOT, "public", "fonts", PACK_FONT_FILES.semibold)),
};

const CLEAN: Answers = { q1: "Adult female, post-menopausal", q2: "yes" };
for (let k = 3; k <= 12; k++) CLEAN[`q${k}`] = "no";

function patient(n: number, contact: string, answers: Answers): PackPatient {
  return {
    submission_id: `00000000-0000-4000-8000-00000000000${n}`,
    contact,
    submitted_at: `2026-10-10T1${n}:02:00Z`,
    consent_at: `2026-10-10T1${n}:02:00Z`,
    confirmed_at: "2026-10-10T18:40:00Z",
    rows: mapDeterministic(FIX.criteria, FIX.questions, answers).rows,
  };
}

const PATIENTS = [
  patient(1, "Lora Primerna (fictional patient), +359 00 000 0001", CLEAN),
  patient(2, "Vesela Izmislena (fictional patient), +359 00 000 0002", { ...CLEAN, q5: "unsure", q8: undefined, q12: undefined }),
  patient(3, "Радка Измислена (fictional patient), +359 00 000 0006", CLEAN),
];

function pack(patients: PackPatient[]): LeadPack {
  return {
    trial: {
      id: "df77c5be-bf13-4b52-8a70-89ddab85dbae",
      nct_id: "NCT06380751",
      title: "Saruparib (AZD5305) Plus Camizestrant or Plus Endocrine Therapy",
      criteria: FIX.criteria,
      questions: FIX.questions,
    },
    hospital: "[Hospital name]",
    created_at: "2026-10-10T18:45:00Z",
    patients,
  };
}

describe("lead pack PDF", async () => {
  const { bytes, pages } = await buildPackPdf(pack(PATIENTS), FONTS);
  if (process.env.PACK_OUT) writeFileSync(process.env.PACK_OUT, bytes);

  it("has exactly one page per selected patient, in order", async () => {
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(3);
    expect(pages.map((p) => p.patient)).toEqual([1, 2, 3]);
    expect(pages.every((p) => !p.continued)).toBe(true);
    for (const n of [1, 2]) {
      const one = await buildPackPdf(pack(PATIENTS.slice(0, n)), FONTS);
      expect((await PDFDocument.load(one.bytes)).getPageCount()).toBe(n);
    }
  });

  it("every page has the trial, NCT ID, hospital, date, the footer and its page number", () => {
    pages.forEach((p, i) => {
      expect(p.texts).toContain("Saruparib (AZD5305) Plus Camizestrant or Plus Endocrine Therapy");
      expect(p.texts).toContain("Lead pack · NCT06380751 · Hospital: [Hospital name] · Date: 10 Oct 2026");
      expect(p.texts).toContain(PACK_FOOTER_TEXT);
      expect(p.texts).toContain(`Page ${i + 1} of 3`);
    });
    expect(PACK_FOOTER_TEXT).toBe(
      "A criteria map, not an eligibility decision. Every line quotes its source. The research organisation makes the eligibility decision.",
    );
  });

  it("each page holds its own patient's contact, consent time, counts line and full matrix", () => {
    pages.forEach((p, i) => {
      const pt = PATIENTS[i];
      expect(p.texts).toContain(pt.contact);
      for (const other of PATIENTS.filter((x) => x !== pt)) expect(p.texts).not.toContain(other.contact);
      expect(p.texts.some((t) => t.startsWith(`Consent given: 10 Oct 2026, ${String(13 + i + 1).padStart(2, "0")}:02`))).toBe(true);
      expect(p.texts).toContain(countsLine(pt.rows));
      // Every criterion quoted (a sub-item with its introducing line), each with its state word.
      for (const c of FIX.criteria) {
        const quoted = c.parent_quote ? `${c.parent_quote} ${c.quote}` : c.quote;
        expect(p.texts).toContain(`“${quoted}”`);
      }
      expect(p.texts.filter((t) => ["met", "not met", "not found", "needs a clinician"].includes(t))).toHaveLength(FIX.criteria.length);
      expect(p.texts).toContain("Criterion (quoted)");
      expect(p.texts).toContain("Answer (quoted)");
    });
    expect(pages[0].texts).toContain("“Adult female, post-menopausal”");
    expect(pages[1].texts).toContain("“Not sure”");
    expect(pages[1].texts).toContain("No answer given.");
  });

  it("each answer names its question, and the page lists those questions as the patient read them", () => {
    for (const p of pages) {
      expect(p.texts).toContain("Questions asked, as the patient read them");
      for (const q of FIX.questions) expect(p.texts).toContain(q.text);
    }
    const i = pages[0].texts.indexOf("“Adult female, post-menopausal”");
    expect(pages[0].texts[i - 1]).toBe("q1");
  });

  it("fits the 34-criteria trial on one page at 6.5 pt or more", () => {
    for (const p of pages) expect(p.size).toBeGreaterThanOrEqual(6.5);
  });

  it("no verdict words beyond the footer, no em dashes", () => {
    for (const p of pages) {
      // Quoted criteria are ClinicalTrials.gov source, not our copy.
      const ours = p.texts.filter((t) => !FIX.criteria.some((c) => t.includes(c.quote))).join("\n");
      expect(findVerdictWord(ours)).toBeNull();
      expect(hasEmDash(ours)).toBe(false);
      expect(ours).toContain(FOOTER_TEXT);
    }
  });

  it("is a PDF with a dated file name", () => {
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
    expect(packFileName(pack(PATIENTS))).toBe("lead-pack-NCT06380751-2026-10-10.pdf");
  });
});
