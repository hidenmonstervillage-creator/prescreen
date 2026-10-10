// Live check against the real ClinicalTrials.gov API. Skipped unless LIVE=1.
import { describe, it, expect } from "vitest";
import { fetchStudy, searchStudies } from "@/lib/ctgov";

describe.skipIf(process.env.LIVE !== "1")("ClinicalTrials.gov live", () => {
  it("fetches the demo study", async () => {
    const s = await fetchStudy("NCT06380751");
    expect(s.nctId).toBe("NCT06380751");
    expect(s.criteriaText.length).toBeGreaterThan(1000);
  }, 30_000);

  it("finds recruiting cancer studies with a site in Bulgaria", async () => {
    const r = await searchStudies({ cond: "cancer", locn: "Bulgaria", pageSize: 10 });
    expect(r.studies.length).toBeGreaterThan(0);
    expect(r.studies.every((s) => s.overallStatus === "RECRUITING")).toBe(true);
    expect(r.studies.every((s) => s.locations.some((l) => l.country === "Bulgaria"))).toBe(true);
  }, 30_000);
});
