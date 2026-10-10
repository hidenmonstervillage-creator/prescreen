import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchStudy, searchStudies, searchUrl, normalizeNctId, parseStudy, CtgovError } from "@/lib/ctgov";

const FIX = join(__dirname, "fixtures");
const studyJson = JSON.parse(readFileSync(join(FIX, "NCT06380751.study.json"), "utf8"));
const criteriaText = readFileSync(join(FIX, "NCT06380751.criteria.md"), "utf8");

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("normalizeNctId", () => {
  it("accepts NCT IDs in any case, with or without the prefix", () => {
    expect(normalizeNctId("NCT06380751")).toBe("NCT06380751");
    expect(normalizeNctId(" nct06380751 ")).toBe("NCT06380751");
    expect(normalizeNctId("06380751")).toBe("NCT06380751");
  });
  it("rejects anything else", () => {
    for (const bad of ["", "NCT123", "NCT063807511", "NCT0638075a", "https://clinicaltrials.gov/study/NCT06380751"]) {
      expect(normalizeNctId(bad)).toBeNull();
    }
  });
});

describe("fetchStudy", () => {
  it("GETs /studies/{nctId} and maps the fields the product uses", async () => {
    const fetchImpl = vi.fn(async () => ok(studyJson));
    const s = await fetchStudy("nct06380751", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith("https://clinicaltrials.gov/api/v2/studies/NCT06380751", expect.anything());
    expect(s.nctId).toBe("NCT06380751");
    expect(s.title).toMatch(/^Saruparib \(AZD5305\)/);
    expect(s.overallStatus).toBe("RECRUITING");
    expect(s.conditions).toEqual(["Advanced Breast Cancer"]);
    expect(s.sex).toBe("ALL");
    expect(s.minimumAge).toBe("18 Years");
    expect(s.maximumAge).toBeNull();
    expect(s.criteriaText).toBe(criteriaText);
    const bg = s.locations.filter((l) => l.country === "Bulgaria" && l.status === "RECRUITING").map((l) => l.city);
    expect(bg.sort()).toEqual(["Plovdiv", "Sofia", "Stara Zagora"]);
  });

  it("keeps no contact details", async () => {
    const withContacts = structuredClone(studyJson);
    withContacts.protocolSection.contactsLocationsModule.centralContacts = [{ name: "X", phone: "1", email: "x@y" }];
    withContacts.protocolSection.contactsLocationsModule.locations[0].contacts = [{ name: "Y", phone: "2" }];
    const s = parseStudy(withContacts);
    const text = JSON.stringify(s);
    expect(text).not.toContain("phone");
    expect(text).not.toContain("email");
    expect(Object.keys(s.locations[0]).sort()).toEqual(["city", "country", "facility", "status"]);
  });

  it("maps a 404 to CtgovError 404 and rejects a bad ID without a request", async () => {
    const notFound = vi.fn(async () => new Response("{}", { status: 404 }));
    await expect(fetchStudy("NCT00000000", notFound)).rejects.toMatchObject({ status: 404 });
    const never = vi.fn();
    await expect(fetchStudy("hello", never)).rejects.toBeInstanceOf(CtgovError);
    expect(never).not.toHaveBeenCalled();
  });

  it("refuses a response for a different study", async () => {
    const other = structuredClone(studyJson);
    other.protocolSection.identificationModule.nctId = "NCT11111111";
    await expect(fetchStudy("NCT06380751", async () => ok(other))).rejects.toMatchObject({ status: 502 });
  });
});

describe("searchStudies (finder, not wired into a screen yet)", () => {
  it("builds the query with query.cond, filter.overallStatus, query.locn and pageSize", () => {
    const u = new URL(searchUrl({ cond: "cancer", locn: "Bulgaria", pageSize: 50 }));
    expect(u.origin + u.pathname).toBe("https://clinicaltrials.gov/api/v2/studies");
    expect(u.searchParams.get("query.cond")).toBe("cancer");
    expect(u.searchParams.get("filter.overallStatus")).toBe("RECRUITING");
    expect(u.searchParams.get("query.locn")).toBe("Bulgaria");
    expect(u.searchParams.get("pageSize")).toBe("50");
  });

  it("clamps pageSize and passes a page token", () => {
    expect(new URL(searchUrl({ cond: "x", pageSize: 5000 })).searchParams.get("pageSize")).toBe("1000");
    expect(new URL(searchUrl({ cond: "x", pageToken: "abc" })).searchParams.get("pageToken")).toBe("abc");
  });

  it("parses studies, totalCount and nextPageToken", async () => {
    const fetchImpl = vi.fn(async () => ok({ studies: [studyJson], totalCount: 55, nextPageToken: "t2" }));
    const r = await searchStudies({ cond: "cancer", locn: "Bulgaria" }, fetchImpl);
    expect(r.totalCount).toBe(55);
    expect(r.nextPageToken).toBe("t2");
    expect(r.studies.map((s) => s.nctId)).toEqual(["NCT06380751"]);
  });
});
