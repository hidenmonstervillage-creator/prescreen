// ClinicalTrials.gov API v2 client. Public, unauthenticated, read only.
// Keeps only what the product shows: no contact names, phones or emails (CLAUDE.md rule 1).

export const CTGOV_BASE = "https://clinicaltrials.gov/api/v2";

export type CtgovLocation = {
  facility: string | null;
  city: string | null;
  country: string | null;
  status: string | null;
};

export type CtgovStudy = {
  nctId: string;
  title: string;
  officialTitle: string | null;
  overallStatus: string | null;
  conditions: string[];
  phases: string[];
  sponsor: string | null;
  locations: CtgovLocation[];
  /** Verbatim criteria markdown as published (eligibilityModule.eligibilityCriteria). */
  criteriaText: string;
  sex: string | null;
  minimumAge: string | null;
  maximumAge: string | null;
};

export type CtgovSearchParams = {
  cond: string;
  locn?: string;
  overallStatus?: string;
  pageSize?: number;
  pageToken?: string;
};

export type CtgovSearchResult = {
  studies: CtgovStudy[];
  nextPageToken: string | null;
  totalCount: number | null;
};

export class CtgovError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CtgovError";
  }
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** "nct06380751 " to "NCT06380751"; null when the input is not an NCT ID. */
export function normalizeNctId(input: string): string | null {
  const m = /^\s*(nct)?\s*(\d{8})\s*$/i.exec(input);
  return m ? `NCT${m[2]}` : null;
}

/** Maps one v2 study JSON object to the fields this product uses. */
export function parseStudy(json: any): CtgovStudy {
  const p = json?.protocolSection;
  const nctId = p?.identificationModule?.nctId;
  if (!nctId) throw new CtgovError("study JSON has no protocolSection.identificationModule.nctId", 502);
  const e = p.eligibilityModule ?? {};
  return {
    nctId,
    title: p.identificationModule.briefTitle ?? nctId,
    officialTitle: p.identificationModule.officialTitle ?? null,
    overallStatus: p.statusModule?.overallStatus ?? null,
    conditions: p.conditionsModule?.conditions ?? [],
    phases: p.designModule?.phases ?? [],
    sponsor: p.sponsorCollaboratorsModule?.leadSponsor?.name ?? null,
    locations: (p.contactsLocationsModule?.locations ?? []).map((l: any) => ({
      facility: l.facility ?? null,
      city: l.city ?? null,
      country: l.country ?? null,
      status: l.status ?? null,
    })),
    criteriaText: e.eligibilityCriteria ?? "",
    sex: e.sex ?? null,
    minimumAge: e.minimumAge ?? null,
    maximumAge: e.maximumAge ?? null,
  };
}

async function getJson(url: string, fetchImpl: FetchLike): Promise<unknown> {
  const res = await fetchImpl(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (res.status === 404) throw new CtgovError("study not found on ClinicalTrials.gov", 404);
  if (!res.ok) throw new CtgovError(`ClinicalTrials.gov answered ${res.status}`, 502);
  return res.json();
}

/** GET /studies/{nctId}: one study. */
export async function fetchStudy(nctId: string, fetchImpl: FetchLike = fetch): Promise<CtgovStudy> {
  const id = normalizeNctId(nctId);
  if (!id) throw new CtgovError("not an NCT ID (NCT followed by 8 digits)", 400);
  const study = parseStudy(await getJson(`${CTGOV_BASE}/studies/${id}`, fetchImpl));
  if (study.nctId !== id) throw new CtgovError("ClinicalTrials.gov returned a different study", 502);
  return study;
}

/** URL for GET /studies with query.cond, filter.overallStatus, query.locn and pageSize. */
export function searchUrl(params: CtgovSearchParams): string {
  const q = new URLSearchParams();
  q.set("query.cond", params.cond);
  q.set("filter.overallStatus", params.overallStatus ?? "RECRUITING");
  if (params.locn) q.set("query.locn", params.locn);
  q.set("pageSize", String(Math.min(Math.max(params.pageSize ?? 20, 1), 1000)));
  q.set("countTotal", "true");
  if (params.pageToken) q.set("pageToken", params.pageToken);
  return `${CTGOV_BASE}/studies?${q.toString()}`;
}

/** GET /studies: finder search. Implemented and tested; not wired into a screen yet. */
export async function searchStudies(params: CtgovSearchParams, fetchImpl: FetchLike = fetch): Promise<CtgovSearchResult> {
  const json = (await getJson(searchUrl(params), fetchImpl)) as any;
  return {
    studies: (json?.studies ?? []).map(parseStudy),
    nextPageToken: json?.nextPageToken ?? null,
    totalCount: typeof json?.totalCount === "number" ? json.totalCount : null,
  };
}
