import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseStudy, type CtgovSearchParams, type CtgovSearchResult, type CtgovStudy } from "@/lib/ctgov";
import {
  cacheIsCurrent,
  checkPlainLines,
  cleanFinderInput,
  findTrials,
  finderSearchUrls,
  lookupOnPlatform,
  numberCriteria,
  phaseLabel,
  PLAIN_PROMPT_VERSION,
  PLAIN_SYSTEM,
  plainMessages,
  quoteOf,
  recruitingSites,
  statusLabel,
  stripOwnId,
  writePlainLines,
  type FinderDeps,
  type FinderInput,
  type PlainLine,
  type PlatformRow,
  type RewriteReport,
} from "@/lib/finder";
import type { JsonCall, JsonResult, LlmJson } from "@/lib/openai";
import { emptyUsage } from "@/lib/openai";
import type { Criterion } from "@/lib/types";
import { VERDICT_WORDS, findVerdictWord, hasEmDash, wordingProblems } from "@/lib/wording";

const FIX = join(__dirname, "fixtures");
const studyJson = JSON.parse(readFileSync(join(FIX, "NCT06380751.study.json"), "utf8"));
const TEXT = readFileSync(join(FIX, "NCT06380751.criteria.md"), "utf8");
const GENERATED = JSON.parse(readFileSync(join(FIX, "NCT06380751.generated.json"), "utf8")) as { criteria: Criterion[] };
const EM = String.fromCharCode(0x2014);
// Banned words are built from the list, never spelled out here (tests/ui.wording.test.ts).
const VERDICT_A = VERDICT_WORDS[0];
const VERDICT_B = VERDICT_WORDS[7];

const DEMO: FinderInput = { condition: "breast cancer", markers: "", city: "Plovdiv" };

/** The fixture study under another NCT ID. */
function study(nctId: string, patch: Partial<CtgovStudy> = {}): CtgovStudy {
  return { ...parseStudy(studyJson), nctId, ...patch };
}

function result(studies: CtgovStudy[], totalCount = studies.length): CtgovSearchResult {
  return { studies, nextPageToken: null, totalCount };
}

/** Replays scripted answers in order and records every call it receives. */
function fakeLlm(answers: unknown[]): LlmJson & { calls: JsonCall[] } {
  const calls: JsonCall[] = [];
  const fn = (async <T>(call: JsonCall): Promise<JsonResult<T>> => {
    calls.push(call);
    const next = answers[calls.length - 1];
    if (next === undefined) throw new Error(`unexpected call ${calls.length}: ${call.label}`);
    if (next instanceof Error) throw next;
    return { data: next as T, raw: JSON.stringify(next), usage: { prompt_tokens: 1000, completion_tokens: 120 } };
  }) as LlmJson & { calls: JsonCall[] };
  fn.calls = calls;
  return fn;
}

/** Five good lines for the NCT06380751 fixture. */
const GOOD_LINES = [
  { criterion_id: "i3", text: "Breast cancer that has spread, or is locally advanced and cannot be cured with treatment" },
  { criterion_id: "i6", text: "An inherited BRCA1, BRCA2 or PALB2 mutation, documented in a test" },
  { criterion_id: "e6", text: "Another primary cancer in the past" },
  { criterion_id: "e14", text: "Major surgery or a serious injury in the 4 weeks before the first dose" },
  { criterion_id: "e8", text: "Spinal cord compression, cancer in the brain or in the lining of the brain" },
];

/** In-memory deps: a scripted search, a trials table and a finder_rewrites table. */
function fakeDeps(opts: {
  searches: CtgovSearchResult[];
  platform?: PlatformRow[];
  llm?: LlmJson;
  cache?: Map<string, { lines: PlainLine[]; report?: RewriteReport }>;
}) {
  const searchCalls: CtgovSearchParams[] = [];
  const cache = opts.cache ?? new Map<string, { lines: PlainLine[]; report?: RewriteReport }>();
  const platformCalls: string[][] = [];
  const deps: FinderDeps = {
    search: async (p) => {
      searchCalls.push(p);
      // An unscripted search (the country fallback after a short city list) finds nothing more.
      return opts.searches[searchCalls.length - 1] ?? result([]);
    },
    platformRows: async (ids) => {
      platformCalls.push(ids);
      return (opts.platform ?? []).filter((r) => ids.includes(r.nct_id));
    },
    readRewrite: async (nct) =>
      cache.has(nct) ? { lines: cache.get(nct)!.lines, promptVersion: cache.get(nct)!.report?.prompt_version ?? null } : null,
    saveRewrite: async (nct, lines, report) => {
      cache.set(nct, { lines, report });
    },
    llm: opts.llm ?? fakeLlm([]),
    now: () => "2026-10-10T12:00:00.000Z",
  };
  return { deps, searchCalls, platformCalls, cache };
}

// ---------------------------------------------------------------------------

describe("search URL builder", () => {
  it("city search: query.cond, query.locn = city + ', Bulgaria', recruiting, 10 per page", () => {
    const u = new URL(finderSearchUrls(DEMO).city);
    expect(u.origin + u.pathname).toBe("https://clinicaltrials.gov/api/v2/studies");
    expect(u.searchParams.get("query.cond")).toBe("breast cancer");
    expect(u.searchParams.get("query.locn")).toBe("Plovdiv, Bulgaria");
    expect(u.searchParams.get("filter.overallStatus")).toBe("RECRUITING");
    expect(u.searchParams.get("pageSize")).toBe("10");
  });

  it("country fallback: query.locn = 'Bulgaria' alone, same condition", () => {
    const u = new URL(finderSearchUrls(DEMO).country);
    expect(u.searchParams.get("query.locn")).toBe("Bulgaria");
    expect(u.searchParams.get("query.cond")).toBe("breast cancer");
    expect(u.searchParams.get("filter.overallStatus")).toBe("RECRUITING");
    expect(u.searchParams.get("pageSize")).toBe("10");
  });

  it("adds the stage or markers text to query.cond", () => {
    const u = new URL(finderSearchUrls({ condition: "breast cancer", markers: "metastatic BRCA2", city: "Sofia" }).city);
    expect(u.searchParams.get("query.cond")).toBe("breast cancer metastatic BRCA2");
    expect(u.searchParams.get("query.locn")).toBe("Sofia, Bulgaria");
  });

  it("cleans the form fields and refuses a search without a condition or a city", () => {
    expect(cleanFinderInput({ condition: "  breast   cancer ", markers: " ", city: " Plovdiv, Bulgaria " })).toEqual({
      ok: true,
      value: { condition: "breast cancer", markers: "", city: "Plovdiv" },
    });
    const bad = cleanFinderInput({ condition: "", city: "Bulgaria" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors).toHaveLength(2);
    expect(cleanFinderInput({ condition: "x".repeat(121), city: "Sofia" }).ok).toBe(false);
    expect(cleanFinderInput({ condition: 7 as unknown as string, city: "Sofia" }).ok).toBe(false);
  });
});

describe("findTrials: searches and limits", () => {
  it("one search when the city search returns 3 or more, at most 5 results", async () => {
    const studies = Array.from({ length: 7 }, (_, k) => study(`NCT0000000${k}`, { criteriaText: "" }));
    const { deps, searchCalls } = fakeDeps({ searches: [result(studies, 7)] });
    const out = await findTrials(DEMO, deps);
    expect(searchCalls).toHaveLength(1);
    expect(searchCalls[0].locn).toBe("Plovdiv, Bulgaria");
    expect(out.widened).toBe(false);
    expect(out.results.map((r) => r.nctId)).toEqual(["NCT00000000", "NCT00000001", "NCT00000002", "NCT00000003", "NCT00000004"]);
  });

  it("exactly 3 in the city: no second search", async () => {
    const { deps, searchCalls } = fakeDeps({
      searches: [result([study("NCT00000001"), study("NCT00000002"), study("NCT00000003")].map((s) => ({ ...s, criteriaText: "" })))],
    });
    await findTrials(DEMO, deps);
    expect(searchCalls).toHaveLength(1);
  });

  it("under 3 in the city: a second search with 'Bulgaria' alone, merged without repeats, city results first", async () => {
    const a = study("NCT00000001", { criteriaText: "" });
    const b = study("NCT00000002", { criteriaText: "" });
    const c = study("NCT00000003", { criteriaText: "" });
    const { deps, searchCalls } = fakeDeps({ searches: [result([a, b]), result([b, c])] });
    const out = await findTrials(DEMO, deps);
    expect(searchCalls.map((p) => p.locn)).toEqual(["Plovdiv, Bulgaria", "Bulgaria"]);
    expect(out.widened).toBe(true);
    expect(out.results.map((r) => r.nctId)).toEqual(["NCT00000001", "NCT00000002", "NCT00000003"]);
    expect(out.searches).toEqual([
      { locn: "Plovdiv, Bulgaria", returned: 2, total: 2 },
      { locn: "Bulgaria", returned: 2, total: 2 },
    ]);
  });

  it("shows phase, status and the recruiting sites in Bulgaria only, with no contacts", async () => {
    const { deps } = fakeDeps({ searches: [result([study("NCT06380751", { criteriaText: "" })])] });
    const out = await findTrials(DEMO, deps);
    const r = out.results[0];
    expect(r.phase).toBe("Phase 3");
    expect(r.status).toBe("Recruiting");
    // Vratsa is WITHDRAWN and drops out; the searched city comes first.
    expect(r.sites).toEqual([
      { facility: "Research Site", city: "Plovdiv" },
      { facility: "Research Site", city: "Sofia" },
      { facility: "Research Site", city: "Stara Zagora" },
    ]);
    expect(r.cities).toEqual(["Plovdiv", "Sofia", "Stara Zagora"]);
    expect(JSON.stringify(r)).not.toMatch(/phone|email|contact/i);
  });
});

describe("labels and sites", () => {
  it("phase and status labels", () => {
    expect(phaseLabel(["PHASE3"])).toBe("Phase 3");
    expect(phaseLabel(["PHASE2", "PHASE3"])).toBe("Phase 2, Phase 3");
    expect(phaseLabel(["EARLY_PHASE1"])).toBe("Early phase 1");
    expect(phaseLabel(["NA"])).toBe("Phase not applicable");
    expect(phaseLabel([])).toBe("Phase not given");
    expect(statusLabel("RECRUITING")).toBe("Recruiting");
    expect(statusLabel("NOT_YET_RECRUITING")).toBe("Not yet recruiting");
    expect(statusLabel(null)).toBe("Status not given");
  });

  it("recruiting sites: Bulgaria and RECRUITING only, de-duplicated", () => {
    const s = {
      locations: [
        { facility: "A Hospital", city: "Sofia", country: "Bulgaria", status: "RECRUITING" },
        { facility: "A Hospital", city: "Sofia", country: "Bulgaria", status: "RECRUITING" },
        { facility: "B Clinic", city: "Burgas", country: "Bulgaria", status: "NOT_YET_RECRUITING" },
        { facility: "C Centre", city: "Bucharest", country: "Romania", status: "RECRUITING" },
        { facility: null, city: "Varna", country: "Bulgaria", status: "RECRUITING" },
      ],
    };
    expect(recruitingSites(s, "Varna")).toEqual([
      { facility: "Site name not given", city: "Varna" },
      { facility: "A Hospital", city: "Sofia" },
    ]);
  });
});

describe("on-platform lookup", () => {
  it("links published trials to /s/<slug> and leaves out unpublished and unrequested ones", async () => {
    const rows: PlatformRow[] = [
      { nct_id: "NCT06380751", slug: "nct06380751-md2jhsjd", published_at: "2026-10-10T11:00:00Z" },
      { nct_id: "NCT05774951", slug: null, published_at: null },
      { nct_id: "NCT11111111", slug: "nct11111111-aaaaaaaa", published_at: "2026-10-10T11:00:00Z" },
    ];
    const fetchRows = vi.fn(async () => rows);
    const links = await lookupOnPlatform(["NCT06380751", "nct05774951", "NCT06727227"], fetchRows);
    expect(fetchRows).toHaveBeenCalledWith(["NCT06380751", "NCT05774951", "NCT06727227"]);
    expect([...links]).toEqual([["NCT06380751", "/s/nct06380751-md2jhsjd"]]);
  });

  it("makes no query for an empty list and ignores a malformed slug", async () => {
    const never = vi.fn(async () => []);
    expect((await lookupOnPlatform([], never)).size).toBe(0);
    expect(never).not.toHaveBeenCalled();
    const odd = await lookupOnPlatform(["NCT06380751"], async () => [
      { nct_id: "NCT06380751", slug: "../site/inbox", published_at: "2026-10-10T11:00:00Z" },
    ]);
    expect(odd.size).toBe(0);
  });

  it("findTrials sets the pre-screen link only for the study on the platform", async () => {
    const { deps } = fakeDeps({
      searches: [result([study("NCT06727227"), study("NCT06380751"), study("NCT05774951")].map((s) => ({ ...s, criteriaText: "" })))],
      platform: [
        { nct_id: "NCT06380751", slug: "nct06380751-md2jhsjd", published_at: "2026-10-10T11:00:00Z" },
        { nct_id: "NCT05774951", slug: null, published_at: null },
      ],
    });
    const out = await findTrials(DEMO, deps);
    expect(out.results.map((r) => [r.nctId, r.prescreenHref])).toEqual([
      ["NCT06727227", null],
      ["NCT06380751", "/s/nct06380751-md2jhsjd"],
      ["NCT05774951", null],
    ]);
  });
});

describe("criterion ids from the criteria text", () => {
  it("numbers NCT06380751 exactly as generation did: same ids, quotes and parent lines", () => {
    const items = numberCriteria(TEXT);
    expect(items).toHaveLength(GENERATED.criteria.length);
    expect(items.map((c) => [c.id, c.section, c.quote, c.parent_quote])).toEqual(
      GENERATED.criteria.map((c) => [c.id, c.section, c.quote, c.parent_quote]),
    );
  });

  it("handles other layouts: 'Key' headings, numbered lists, escapes, and plain-line sections", () => {
    const text = [
      "Key Inclusion Criteria:",
      "",
      "1. Age \\>= 18 years",
      "2. Measurable disease per RECIST 1.1",
      "",
      "Key Exclusion Criteria:",
      "",
      "- Prior therapy with any of:",
      "  - drug A",
      "  - drug B",
      "- Pregnant or breastfeeding",
    ].join("\n");
    expect(numberCriteria(text)).toEqual([
      { id: "i1", section: "inclusion", quote: "Age >= 18 years", parent_quote: null },
      { id: "i2", section: "inclusion", quote: "Measurable disease per RECIST 1.1", parent_quote: null },
      { id: "e1", section: "exclusion", quote: "drug A", parent_quote: "Prior therapy with any of:" },
      { id: "e2", section: "exclusion", quote: "drug B", parent_quote: "Prior therapy with any of:" },
      { id: "e3", section: "exclusion", quote: "Pregnant or breastfeeding", parent_quote: null },
    ]);
    const plain = "Inclusion Criteria:\nAdults with asthma\n\nExclusion Criteria:\nCurrent smokers";
    expect(numberCriteria(plain).map((c) => `${c.id} ${c.quote}`)).toEqual(["i1 Adults with asthma", "e1 Current smokers"]);
    expect(numberCriteria("No headings here\n* a bullet")).toEqual([]);
  });

  it("a long sentence that mentions inclusion criteria is not taken as a heading", () => {
    const text = "Exclusion Criteria:\n\nParticipants who met the inclusion criteria of the earlier study more than one year ago\n* Active infection";
    expect(numberCriteria(text).map((c) => c.id)).toEqual(["e1"]);
  });
});

describe("plain-word lines: checks with a fake model", () => {
  const criteria = numberCriteria(TEXT);
  const byId = new Map(criteria.map((c) => [c.id, c]));

  it("the prompt and schema pass the wording checks generation uses", () => {
    expect(wordingProblems(PLAIN_SYSTEM)).toEqual([]);
    for (const m of plainMessages({ title: "Saruparib study", conditions: ["Advanced Breast Cancer"] }, criteria)) {
      expect(findVerdictWord(m.content)).toBeNull();
      expect(hasEmDash(m.content)).toBe(false);
    }
  });

  it("keeps clean lines, ending in their criterion id, with the verbatim quote attached in code", async () => {
    const llm = fakeLlm([{ lines: GOOD_LINES }]);
    const { lines, report } = await writePlainLines(study("NCT06380751"), criteria, llm, emptyUsage(), "t");
    expect(llm.calls).toHaveLength(1);
    expect(llm.calls[0].messages[1].content).toContain('"id": "e6"');
    expect(lines.map((l) => l.criterion_id)).toEqual(["i3", "i6", "e6", "e14", "e8"]);
    for (const l of lines) {
      expect(l.quote).toBe(quoteOf(byId.get(l.criterion_id)!));
      expect(TEXT.replace(/\s+/g, " ")).toContain(byId.get(l.criterion_id)!.quote);
      expect(l.section).toBe(l.criterion_id.startsWith("i") ? "inclusion" : "exclusion");
    }
    expect(report).toMatchObject({ returned: 5, kept: 5, dropped: [], prompt_tokens: 1000, completion_tokens: 120 });
  });

  it("drops each failing line on its own and never the rest", () => {
    const { kept, dropped } = checkPlainLines(
      [
        { criterion_id: "i3", text: `Advanced breast cancer ${EM} spread or not curable` },
        { criterion_id: "i1", text: `Adults who are ${VERDICT_A} by age` },
        { criterion_id: "e99", text: "Something not in the list" },
        { criterion_id: "e6", text: "Another primary cancer in the past" },
        { criterion_id: "e6", text: "A second line for the same criterion" },
        { criterion_id: "e14", text: "Major surgery in the 6 weeks before the first dose" },
        { criterion_id: "e11", text: "  " },
        { criterion_id: "e9", text: "Active, uncontrolled hepatitis B or C (e9)" },
      ],
      criteria,
    );
    expect(kept.map((l) => [l.criterion_id, l.text])).toEqual([
      ["e6", "Another primary cancer in the past"],
      ["e9", "Active, uncontrolled hepatitis B or C"],
    ]);
    const why = Object.fromEntries(dropped.map((d) => [`${d.criterion_id} ${d.text.slice(0, 12)}`, d.problems.join("; ")]));
    expect(why["i3 Advanced bre"]).toContain("em dash");
    expect(why["i1 Adults who a"]).toContain("verdict word");
    expect(why["e99 Something no"]).toContain("names no criterion");
    expect(why["e6 A second lin"]).toContain("repeats");
    expect(why["e14 Major surger"]).toContain("numbers not in the criterion text: 6");
    expect(why["e11 "]).toContain("empty");
  });

  it("keeps at most 5 lines", () => {
    const six = [...GOOD_LINES, { criterion_id: "e11", text: "Active tuberculosis" }];
    const { kept, dropped } = checkPlainLines(six, criteria);
    expect(kept).toHaveLength(5);
    expect(dropped).toEqual([{ criterion_id: "e11", text: "Active tuberculosis", problems: ["over the 5 line limit"] }]);
  });

  it("strips only the line's own id", () => {
    expect(stripOwnId("Another cancer (e6)", "e6")).toBe("Another cancer");
    expect(stripOwnId("Another cancer [E6].", "e6")).toBe("Another cancer");
    expect(stripOwnId("Another cancer, e6", "e6")).toBe("Another cancer");
    expect(stripOwnId("CYP3A4 drugs", "e19")).toBe("CYP3A4 drugs");
  });

  it("a study whose every line fails is kept, with no lines", async () => {
    const llm = fakeLlm([{ lines: [{ criterion_id: "i1", text: `Adults, ${VERDICT_B} fine` }] }]);
    const { deps } = fakeDeps({ searches: [result([study("NCT06380751")])], llm });
    const out = await findTrials(DEMO, deps);
    expect(out.results).toHaveLength(1);
    expect(out.results[0].lines).toEqual([]);
    expect(out.results[0].linesStatus).toBe("none_passed");
  });

  it("a model failure keeps the study, shows no lines and caches nothing", async () => {
    const llm = fakeLlm([new Error("OpenAI 500")]);
    const { deps, cache } = fakeDeps({ searches: [result([study("NCT06380751")])], llm });
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await findTrials(DEMO, deps);
    errors.mockRestore();
    expect(out.results[0].linesStatus).toBe("unavailable");
    expect(out.results[0].nctId).toBe("NCT06380751");
    expect(cache.size).toBe(0);
  });

  it("no criteria list: no model call", async () => {
    const llm = fakeLlm([]);
    const { deps } = fakeDeps({ searches: [result([study("NCT06380751", { criteriaText: "Free text without headings" })])], llm });
    const out = await findTrials(DEMO, deps);
    expect(llm.calls).toHaveLength(0);
    expect(out.results[0].linesStatus).toBe("no_list");
  });
});

describe("plain-word lines: cache per NCT", () => {
  it("the second identical search makes no model call", async () => {
    const llm = fakeLlm([{ lines: GOOD_LINES }]);
    const cache = new Map();
    const first = fakeDeps({ searches: [result([study("NCT06380751")])], llm, cache });
    const a = await findTrials(DEMO, first.deps);
    expect(a.modelCalls).toBe(1);
    expect(a.results[0].linesStatus).toBe("written");
    expect(cache.get("NCT06380751").report).toMatchObject({ kept: 5, model: "gpt-4o", prompt_version: PLAIN_PROMPT_VERSION });

    const second = fakeDeps({ searches: [result([study("NCT06380751")])], llm, cache });
    const b = await findTrials(DEMO, second.deps);
    expect(llm.calls).toHaveLength(1);
    expect(b.modelCalls).toBe(0);
    expect(b.cacheHits).toBe(1);
    expect(b.results[0].linesStatus).toBe("cached");
    expect(b.results[0].lines).toEqual(a.results[0].lines);
  });

  it("a cached line whose criterion text changed on ClinicalTrials.gov is rewritten", async () => {
    const criteria = numberCriteria(TEXT);
    const stale: PlainLine[] = [{ criterion_id: "e6", section: "exclusion", text: "Another cancer", quote: "History of another cancer" }];
    expect(cacheIsCurrent(stale, criteria)).toBe(false);
    const llm = fakeLlm([{ lines: GOOD_LINES }]);
    // Current prompt version, so only the changed criterion text makes it stale.
    const cache = new Map([["NCT06380751", { lines: stale, report: { prompt_version: PLAIN_PROMPT_VERSION } as RewriteReport }]]);
    const { deps } = fakeDeps({ searches: [result([study("NCT06380751")])], llm, cache });
    const out = await findTrials(DEMO, deps);
    expect(llm.calls).toHaveLength(1);
    expect(out.results[0].lines).toHaveLength(5);
  });

  it("lines cached under an earlier prompt version are rewritten", async () => {
    const llm = fakeLlm([{ lines: GOOD_LINES }, { lines: GOOD_LINES }]);
    const cache = new Map();
    await findTrials(DEMO, fakeDeps({ searches: [result([study("NCT06380751")])], llm, cache }).deps);
    cache.get("NCT06380751").report.prompt_version = PLAIN_PROMPT_VERSION - 1;
    const again = await findTrials(DEMO, fakeDeps({ searches: [result([study("NCT06380751")])], llm, cache }).deps);
    expect(llm.calls).toHaveLength(2);
    expect(again.results[0].linesStatus).toBe("written");
    expect(cache.get("NCT06380751").report.prompt_version).toBe(PLAIN_PROMPT_VERSION);
  });

  it("a cache read failure falls back to the model and still shows the study", async () => {
    const llm = fakeLlm([{ lines: GOOD_LINES }]);
    const { deps } = fakeDeps({ searches: [result([study("NCT06380751")])], llm });
    deps.readRewrite = async () => {
      throw new Error("db down");
    };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await findTrials(DEMO, deps);
    errors.mockRestore();
    expect(out.results[0].lines).toHaveLength(5);
  });
});
