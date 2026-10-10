import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import FinderResultList from "@/components/FinderResultList";
import FinderForm from "@/components/FinderForm";
import type { FinderOutcome, FinderResult } from "@/lib/finder";
import { emptyUsage } from "@/lib/openai";
import { findVerdictWord, hasEmDash } from "@/lib/wording";

const ROOT = join(__dirname, "..");

const onPlatform: FinderResult = {
  nctId: "NCT06380751",
  title: "Saruparib (AZD5305) Plus Camizestrant or Plus Endocrine Therapy",
  phase: "Phase 3",
  status: "Recruiting",
  sites: [
    { facility: "Research Site", city: "Plovdiv" },
    { facility: "Research Site", city: "Sofia" },
  ],
  cities: ["Plovdiv", "Sofia"],
  lines: [
    { criterion_id: "e6", section: "exclusion", text: "Another primary cancer in the past", quote: "History of another primary malignancy" },
    {
      criterion_id: "i3",
      section: "inclusion",
      text: "Breast cancer that has spread or cannot be cured",
      quote: "Advanced breast cancer with either locally advanced disease not amenable to curative treatment or metastatic disease",
    },
  ],
  linesStatus: "cached",
  prescreenHref: "/s/nct06380751-md2jhsjd",
};

const offPlatform: FinderResult = {
  ...onPlatform,
  nctId: "NCT06727227",
  title: "Real-world study",
  phase: "Phase not given",
  sites: [{ facility: "Hospital", city: "Burgas" }],
  cities: ["Burgas"],
  lines: [],
  linesStatus: "unavailable",
  prescreenHref: null,
};

const noSites: FinderResult = { ...offPlatform, nctId: "NCT05774951", sites: [], cities: [], linesStatus: "none_passed" };

function outcome(results: FinderResult[], widened = false): FinderOutcome {
  return {
    input: { condition: "breast cancer", markers: "", city: "Plovdiv" },
    widened,
    searches: [{ locn: "Plovdiv, Bulgaria", returned: results.length, total: results.length }],
    results,
    usage: emptyUsage(),
    modelCalls: 0,
    cacheHits: 0,
  };
}

describe("/find result list", () => {
  // Text-node separators, if any, are dropped so assertions read like the page.
  const html = renderToStaticMarkup(<FinderResultList outcome={outcome([offPlatform, onPlatform, noSites])} />).replace(/<!-- -->/g, "");

  it("one data-trial-nct per result, with the NCT link to ClinicalTrials.gov", () => {
    expect(html.match(/data-trial-nct=/g)).toHaveLength(3);
    expect(html).toContain('data-trial-nct="NCT06380751"');
    expect(html).toContain('href="https://clinicaltrials.gov/study/NCT06380751"');
  });

  it("the pre-screen button only for the study on the platform, linking to its public page", () => {
    expect(html.match(/data-prescreen-link/g)).toHaveLength(1);
    expect(html).toMatch(/href="\/s\/nct06380751-md2jhsjd"[^>]*data-prescreen-link[^>]*>Pre-screen patients</);
  });

  it("other studies say they are not on the platform yet, with the site city list", () => {
    expect(html).toContain("Not on the platform yet. Hospitals in Bulgaria: Burgas.");
    expect(html).toContain("No recruiting hospital in Bulgaria is listed.");
    expect(html).toContain("No hospital in Bulgaria is listed as recruiting.");
  });

  it("plain-word lines end with their criterion id and carry the verbatim quote on hover and on expand", () => {
    expect(html).toContain('data-criterion-line="e6" title="History of another primary malignancy"');
    expect(html).toMatch(/Another primary cancer in the past <span[^>]*>\(e6\)<\/span>/);
    expect(html).toContain("“History of another primary malignancy”");
    expect(html).toContain("Top criteria in plain words");
  });

  it("no verdict words, no em dashes, no staff contacts, and no product name for the search", () => {
    const text = html.replace(/<[^>]+>/g, " ");
    expect(findVerdictWord(text)).toBeNull();
    expect(hasEmDash(html)).toBe(false);
    expect(html).not.toMatch(/phone|e-?mail|@/i);
    expect(html.toLowerCase()).not.toContain("finder");
  });

  it("says when the search was widened to all of Bulgaria, and when nothing matched", () => {
    const widened = renderToStaticMarkup(<FinderResultList outcome={outcome([offPlatform], true)} />);
    expect(widened).toContain("Fewer than 3 found in Plovdiv");
    const none = renderToStaticMarkup(<FinderResultList outcome={outcome([])} />);
    expect(none).toContain("data-find-empty");
  });
});

describe("/find page copy", () => {
  const page = readFileSync(join(ROOT, "app/find/page.tsx"), "utf8");

  it("heading and subline are exact, and the page never calls itself a finder", () => {
    expect(page).toContain("Find a recruiting trial for a patient");
    expect(page).toMatch(/the research team at the trial site contacts the patient after the pre-screen/);
    expect(page.toLowerCase()).not.toContain("trial finder");
    const form = renderToStaticMarkup(<FinderForm values={{ condition: "breast cancer", markers: "", city: "Plovdiv" }} errors={[]} />);
    expect(form.toLowerCase()).not.toContain("finder");
    expect(form).toContain('name="condition"');
    expect(form).toContain('name="markers"');
    expect(form).toContain('name="city"');
    expect(form).toContain('action="/find"');
  });

  it("the home page links to /find", () => {
    expect(readFileSync(join(ROOT, "app/page.tsx"), "utf8")).toContain('href="/find"');
  });
});
