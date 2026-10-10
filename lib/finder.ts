// Doctor-side search: recruiting studies with a site in Bulgaria, from ClinicalTrials.gov,
// each with up to 5 of its criteria rewritten in plain words by gpt-4o. Every line names
// the criterion it came from, and code (never the model) attaches that criterion's verbatim
// text. A line that fails a check is dropped; the study is always kept.
// Pure logic with injected dependencies; lib/finder-store.ts supplies the database side.
import { normalizeNctId, searchUrl, type CtgovSearchParams, type CtgovSearchResult, type CtgovStudy } from "./ctgov";
import { MODEL, addUsage, emptyUsage, type ChatMessage, type LlmJson } from "./openai";
import { normalizeWs, visibleText } from "./text";
import { wordingProblems } from "./wording";
import type { Section, TokenUsage } from "./types";

export const COUNTRY = "Bulgaria";
export const PAGE_SIZE = 10;
export const MAX_RESULTS = 5;
/** Below this many studies in the city, a second search covers the whole country. */
export const MIN_CITY_RESULTS = 3;
export const PLAIN_LINES = 5;
export const MAX_LINE_CHARS = 240;
/** Criteria sent to the model per study; very long lists are cut here. */
export const MAX_PROMPT_ITEMS = 150;
export const INPUT_LIMITS = { condition: 120, markers: 120, city: 60 } as const;

// ---------------------------------------------------------------------------
// Input and search

export type FinderInput = { condition: string; markers: string; city: string };

/** Trims the form fields; the city loses a trailing ", Bulgaria" because the search adds it. */
export function cleanFinderInput(
  raw: Partial<Record<keyof FinderInput, unknown>>,
): { ok: true; value: FinderInput } | { ok: false; errors: string[] } {
  const field = (v: unknown) => (typeof v === "string" ? normalizeWs(v) : "");
  const condition = field(raw.condition);
  const markers = field(raw.markers);
  const city = field(raw.city).replace(new RegExp(`[,\\s]*\\b${COUNTRY}$`, "i"), "").trim();
  const errors: string[] = [];
  if (!condition) errors.push("Enter a condition.");
  else if (condition.length > INPUT_LIMITS.condition) errors.push(`Keep the condition under ${INPUT_LIMITS.condition} characters.`);
  if (markers.length > INPUT_LIMITS.markers) errors.push(`Keep the stage or markers under ${INPUT_LIMITS.markers} characters.`);
  if (!city) errors.push(`Enter a city in ${COUNTRY}.`);
  else if (city.length > INPUT_LIMITS.city) errors.push(`Keep the city under ${INPUT_LIMITS.city} characters.`);
  return errors.length ? { ok: false, errors } : { ok: true, value: { condition, markers, city } };
}

/** The city search and the country-wide fallback, both recruiting only, 10 per page. */
export function finderSearches(input: FinderInput): { city: CtgovSearchParams; country: CtgovSearchParams } {
  const cond = input.markers ? `${input.condition} ${input.markers}` : input.condition;
  return {
    city: { cond, locn: `${input.city}, ${COUNTRY}`, overallStatus: "RECRUITING", pageSize: PAGE_SIZE },
    country: { cond, locn: COUNTRY, overallStatus: "RECRUITING", pageSize: PAGE_SIZE },
  };
}

export function finderSearchUrls(input: FinderInput): { city: string; country: string } {
  const s = finderSearches(input);
  return { city: searchUrl(s.city), country: searchUrl(s.country) };
}

// ---------------------------------------------------------------------------
// Study fields shown on a result

export type Site = { facility: string; city: string };

/** Sites in Bulgaria whose own status is RECRUITING, the searched city first. No contacts. */
export function recruitingSites(study: Pick<CtgovStudy, "locations">, city: string): Site[] {
  const seen = new Set<string>();
  const out: Site[] = [];
  for (const l of study.locations) {
    if (l.country !== COUNTRY || l.status !== "RECRUITING") continue;
    const site = { facility: normalizeWs(l.facility ?? "") || "Site name not given", city: normalizeWs(l.city ?? "") || "City not given" };
    const key = `${site.facility}|${site.city}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(site);
  }
  const here = city.toLowerCase();
  const inCity = (s: Site) => (s.city.toLowerCase() === here ? 0 : 1);
  return out.sort((a, b) => inCity(a) - inCity(b) || a.city.localeCompare(b.city) || a.facility.localeCompare(b.facility));
}

export function phaseLabel(phases: string[]): string {
  if (!phases.length) return "Phase not given";
  return phases
    .map((p) => {
      if (p === "NA") return "Phase not applicable";
      const early = /^EARLY_PHASE(\d)$/.exec(p);
      if (early) return `Early phase ${early[1]}`;
      const m = /^PHASE(\d)$/.exec(p);
      return m ? `Phase ${m[1]}` : p;
    })
    .join(", ");
}

export function statusLabel(status: string | null): string {
  if (!status) return "Status not given";
  const s = status.toLowerCase().replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// On-platform lookup

export type PlatformRow = { nct_id: string; slug: string | null; published_at: string | null };

const SLUG_RE = /^[a-z0-9-]{6,80}$/;

/** NCT ID to "/s/<slug>" for the studies published on this platform; unpublished ones are left out. */
export async function lookupOnPlatform(
  nctIds: string[],
  fetchRows: (nctIds: string[]) => Promise<PlatformRow[]>,
): Promise<Map<string, string>> {
  const ids = [...new Set(nctIds.map((id) => normalizeNctId(id)).filter((id): id is string => Boolean(id)))];
  const links = new Map<string, string>();
  if (!ids.length) return links;
  for (const r of await fetchRows(ids)) {
    const id = normalizeNctId(r.nct_id ?? "");
    if (!id || !ids.includes(id) || !r.published_at || !r.slug || !SLUG_RE.test(r.slug)) continue;
    links.set(id, `/s/${r.slug}`);
  }
  return links;
}

// ---------------------------------------------------------------------------
// Criterion ids from the criteria text, in code

export type NumberedCriterion = { id: string; section: Section; quote: string; parent_quote: string | null };

const BULLET_RE = /^(\s*)(?:[*\-•+]|\d+[.)])\s+(.*)$/;
const INCLUSION_HEADING = /\binclusion criteria\b/i;
const EXCLUSION_HEADING = /\bexclusion criteria\b/i;
const MAX_HEADING_CHARS = 60;

function indentOf(ws: string): number {
  return ws.replace(/\t/g, "    ").length;
}

/**
 * Numbers the bullet and numbered lines under the inclusion and exclusion headings as
 * i1, i2 ... and e1, e2 ..., the convention generation uses: a line that ends with a colon
 * and introduces an indented sub-list is not an item; each sub-item is, with that line as
 * its parent_quote. A section with no bullets uses its plain lines. Quotes are the visible
 * text (markdown escapes removed, whitespace normalised), so they are verbatim.
 */
export function numberCriteria(text: string): NumberedCriterion[] {
  type Entry = { section: Section; indent: number; text: string; bullet: boolean };
  const entries: Entry[] = [];
  let section: Section | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const b = BULLET_RE.exec(raw);
    if (!b) {
      const line = visibleText(raw.replace(/[*_#]/g, " "));
      if (line.length <= MAX_HEADING_CHARS && EXCLUSION_HEADING.test(line)) section = "exclusion";
      else if (line.length <= MAX_HEADING_CHARS && INCLUSION_HEADING.test(line)) section = "inclusion";
      else if (section && line) entries.push({ section, indent: 0, text: visibleText(raw), bullet: false });
      continue;
    }
    const itemText = visibleText(b[2]);
    if (section && itemText) entries.push({ section, indent: indentOf(b[1]), text: itemText, bullet: true });
  }
  const bulleted = new Set(entries.filter((x) => x.bullet).map((x) => x.section));
  const list = entries.filter((x) => x.bullet || !bulleted.has(x.section));

  const items: NumberedCriterion[] = [];
  const parents: Entry[] = [];
  let i = 0;
  let e = 0;
  for (let k = 0; k < list.length; k++) {
    const cur = list[k];
    const next = list[k + 1];
    while (parents.length) {
      const top = parents[parents.length - 1];
      if (cur.indent > top.indent && cur.section === top.section) break;
      parents.pop();
    }
    if (cur.text.endsWith(":") && next && next.section === cur.section && next.indent > cur.indent) {
      parents.push(cur);
      continue;
    }
    items.push({
      id: cur.section === "inclusion" ? `i${++i}` : `e${++e}`,
      section: cur.section,
      quote: cur.text,
      parent_quote: parents.length ? parents[parents.length - 1].text : null,
    });
  }
  return items;
}

/** The criterion text exactly as quoted, with its introducing line when it is a sub-item. */
export function quoteOf(c: NumberedCriterion): string {
  return c.parent_quote ? `${c.parent_quote} ${c.quote}` : c.quote;
}

// ---------------------------------------------------------------------------
// Plain-word lines: one model call per study, checked line by line in code

/** Bump when PLAIN_SYSTEM changes: cached lines written under another version are rewritten. */
export const PLAIN_PROMPT_VERSION = 2;

export const PLAIN_SYSTEM = `You help a doctor read the criteria list of one clinical trial quickly. You get the criteria as items, each with an id ("i" for an inclusion item, "e" for an exclusion item) and its exact text.

Pick the ${PLAIN_LINES} items that say the most about who the trial is for: the condition and its stage, required tumour markers, mutations or earlier treatments, and the exclusions that apply to many people with this condition. Prefer items a doctor can check from a patient's history.

For each item you pick, write one line in plain, everyday words:
1. Rewrite the item; do not copy its wording. Replace technical phrases and abbreviations with everyday words, for example "histologically or cytologically documented" becomes "confirmed by a test of tissue or cells", "metastatic" becomes "has spread to other parts of the body", "not amenable to curative treatment" becomes "cannot be cured", "germline" becomes "inherited". Keep the names of genes, markers, tests and medicines (for example BRCA1, HER2, HR-positive, camizestrant).
2. Keep the item's meaning complete: keep every time limit and number as written, and keep any exception ("except", "unless", "apart from") in short form. Never add a number, age or limit that is not in the item's text.
3. Do not say whether the item is an inclusion or an exclusion item; the page shows that next to the line. So describe the condition, treatment or finding itself, without "must", "cannot", "no" or "not allowed". Example: for the exclusion item "History of another primary malignancy" write "Another primary cancer in the past", not "Cannot have had another cancer".
4. Do not speak about any particular patient, do not give advice, and do not say what the item means for anyone taking part.
5. At most 25 words. Use commas or full stops, never dashes as punctuation. Do not put the id in the text.
6. "criterion_id" is the id of the item the line comes from, exactly as given. Use each id at most once.`;

const PLAIN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lines"],
  properties: {
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["criterion_id", "text"],
        properties: {
          criterion_id: { type: "string" },
          text: { type: "string" },
        },
      },
    },
  },
} as const;

export type PlainLine = { criterion_id: string; section: Section; text: string; quote: string };
export type DroppedLine = { criterion_id: string; text: string; problems: string[] };
export type RewriteReport = {
  model: string;
  prompt_version: number;
  prompt_tokens: number;
  completion_tokens: number;
  returned: number;
  kept: number;
  dropped: DroppedLine[];
  items_sent: number;
  items_total: number;
  written_at: string;
};

const NUMBER_RE = /\d+(?:[.,]\d+)?/g;

function numbersIn(s: string): string[] {
  return s.match(NUMBER_RE) ?? [];
}

/** Removes a trailing "(e6)", "[e6]" or "e6" naming the line's own criterion; code appends the id. */
export function stripOwnId(text: string, id: string): string {
  if (!id) return text;
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`[\\s,.;:]*[(\\[]?\\s*${esc}\\s*[)\\]]?[.\\s]*$`, "i"), "").trim();
}

/**
 * Checks each line the model wrote. A line is kept only when it names a criterion in the
 * list (once), is short, passes the wording checks generation uses (no verdict words, no
 * em dash) and contains no number that the criterion's own text does not contain.
 */
export function checkPlainLines(
  raw: { criterion_id?: unknown; text?: unknown }[],
  criteria: NumberedCriterion[],
): { kept: PlainLine[]; dropped: DroppedLine[] } {
  const byId = new Map(criteria.map((c) => [c.id, c]));
  const used = new Set<string>();
  const kept: PlainLine[] = [];
  const dropped: DroppedLine[] = [];
  for (const r of raw) {
    const id = normalizeWs(String(r?.criterion_id ?? ""));
    const text = stripOwnId(normalizeWs(String(r?.text ?? "")), id);
    const c = byId.get(id);
    const problems: string[] = [];
    if (!c) problems.push("names no criterion in the list");
    else if (used.has(id)) problems.push("repeats a criterion already used");
    if (!text) problems.push("text is empty");
    else {
      if (text.length > MAX_LINE_CHARS) problems.push("text is too long");
      problems.push(...wordingProblems(text));
      if (c) {
        const source = new Set(numbersIn(quoteOf(c)));
        const extra = numbersIn(text).filter((n) => !source.has(n));
        if (extra.length) problems.push(`numbers not in the criterion text: ${extra.join(", ")}`);
      }
    }
    if (!problems.length && kept.length >= PLAIN_LINES) problems.push(`over the ${PLAIN_LINES} line limit`);
    if (problems.length || !c) {
      dropped.push({ criterion_id: id, text, problems });
      continue;
    }
    used.add(id);
    kept.push({ criterion_id: id, section: c.section, text, quote: quoteOf(c) });
  }
  return { kept, dropped };
}

export function plainMessages(
  study: Pick<CtgovStudy, "title" | "conditions">,
  criteria: NumberedCriterion[],
): ChatMessage[] {
  const items = criteria.slice(0, MAX_PROMPT_ITEMS).map((c) => ({ id: c.id, text: quoteOf(c) }));
  return [
    { role: "system", content: PLAIN_SYSTEM },
    {
      role: "user",
      content: `Trial title: ${study.title}\nConditions: ${study.conditions.join(", ") || "not given"}\n\nCriteria items:\n${JSON.stringify(items, null, 2)}`,
    },
  ];
}

/** One model call for one study's criteria; the lines that pass every check. */
export async function writePlainLines(
  study: Pick<CtgovStudy, "nctId" | "title" | "conditions">,
  criteria: NumberedCriterion[],
  llm: LlmJson,
  usage: TokenUsage,
  nowIso: string,
): Promise<{ lines: PlainLine[]; report: RewriteReport }> {
  const res = await llm<{ lines: { criterion_id: string; text: string }[] }>({
    label: `plain lines ${study.nctId}`,
    messages: plainMessages(study, criteria),
    schemaName: "plain_criteria_lines",
    schema: PLAIN_SCHEMA,
    maxTokens: 800,
  });
  addUsage(usage, res.usage);
  const returned = Array.isArray(res.data?.lines) ? res.data.lines : [];
  const { kept, dropped } = checkPlainLines(returned, criteria);
  return {
    lines: kept,
    report: {
      model: MODEL,
      prompt_version: PLAIN_PROMPT_VERSION,
      prompt_tokens: res.usage.prompt_tokens,
      completion_tokens: res.usage.completion_tokens,
      returned: returned.length,
      kept: kept.length,
      dropped,
      items_sent: Math.min(criteria.length, MAX_PROMPT_ITEMS),
      items_total: criteria.length,
      written_at: nowIso,
    },
  };
}

/** A cached line set still fits when every line names a criterion whose text is unchanged. */
export function cacheIsCurrent(lines: PlainLine[], criteria: NumberedCriterion[]): boolean {
  if (!Array.isArray(lines)) return false;
  const byId = new Map(criteria.map((c) => [c.id, c]));
  return lines.every((l) => {
    const c = byId.get(l?.criterion_id);
    return Boolean(c) && c!.section === l.section && quoteOf(c!) === l.quote && typeof l.text === "string";
  });
}

// ---------------------------------------------------------------------------
// The whole search

/** promptVersion: PLAIN_PROMPT_VERSION the lines were written under, null when unknown. */
export type CachedRewrite = { lines: PlainLine[]; promptVersion: number | null };

export type FinderDeps = {
  search: (params: CtgovSearchParams) => Promise<CtgovSearchResult>;
  platformRows: (nctIds: string[]) => Promise<PlatformRow[]>;
  readRewrite: (nctId: string) => Promise<CachedRewrite | null>;
  saveRewrite: (nctId: string, lines: PlainLine[], report: RewriteReport) => Promise<void>;
  llm: LlmJson;
  now?: () => string;
};

/** Why a result has fewer than 5 lines, when it does. */
export type LinesStatus = "written" | "cached" | "no_list" | "none_passed" | "unavailable";

export type FinderResult = {
  nctId: string;
  title: string;
  phase: string;
  status: string;
  sites: Site[];
  cities: string[];
  lines: PlainLine[];
  linesStatus: LinesStatus;
  prescreenHref: string | null;
};

export type FinderOutcome = {
  input: FinderInput;
  /** True when the city search found fewer than 3 and the country search was added. */
  widened: boolean;
  searches: { locn: string; returned: number; total: number | null }[];
  results: FinderResult[];
  usage: TokenUsage;
  modelCalls: number;
  cacheHits: number;
};

export async function findTrials(input: FinderInput, deps: FinderDeps): Promise<FinderOutcome> {
  const now = deps.now ?? (() => new Date().toISOString());
  const params = finderSearches(input);
  const first = await deps.search(params.city);
  const searches = [{ locn: params.city.locn!, returned: first.studies.length, total: first.totalCount }];
  let studies = first.studies;
  let widened = false;
  if (first.studies.length < MIN_CITY_RESULTS) {
    widened = true;
    const second = await deps.search(params.country);
    searches.push({ locn: params.country.locn!, returned: second.studies.length, total: second.totalCount });
    const seen = new Set(studies.map((s) => s.nctId));
    studies = [...studies, ...second.studies.filter((s) => !seen.has(s.nctId))];
  }
  const links = await lookupOnPlatform(
    studies.map((s) => s.nctId),
    deps.platformRows,
  );
  // Studies with a published pre-screen first, API order otherwise (sort is stable).
  // Sorted before the cut, so a published study past the fifth API result still shows.
  const onPlatform = (s: CtgovStudy) => (links.has(s.nctId) ? 0 : 1);
  const top = [...studies].sort((a, b) => onPlatform(a) - onPlatform(b)).slice(0, MAX_RESULTS);

  const usage = emptyUsage();
  let cacheHits = 0;

  async function linesFor(study: CtgovStudy): Promise<{ lines: PlainLine[]; linesStatus: LinesStatus }> {
    const criteria = numberCriteria(study.criteriaText);
    if (!criteria.length) return { lines: [], linesStatus: "no_list" };
    let cached: CachedRewrite | null = null;
    try {
      cached = await deps.readRewrite(study.nctId);
    } catch (err) {
      console.error(`[find] cache read failed for ${study.nctId}: ${(err as Error).message}`);
    }
    if (cached && cached.promptVersion === PLAIN_PROMPT_VERSION && cacheIsCurrent(cached.lines, criteria)) {
      cacheHits += 1;
      return { lines: cached.lines, linesStatus: cached.lines.length ? "cached" : "none_passed" };
    }
    try {
      const { lines, report } = await writePlainLines(study, criteria, deps.llm, usage, now());
      try {
        await deps.saveRewrite(study.nctId, lines, report);
      } catch (err) {
        console.error(`[find] cache write failed for ${study.nctId}: ${(err as Error).message}`);
      }
      return { lines, linesStatus: lines.length ? "written" : "none_passed" };
    } catch (err) {
      console.error(`[find] plain lines not written for ${study.nctId}: ${(err as Error).message}`);
      return { lines: [], linesStatus: "unavailable" };
    }
  }

  const results = await Promise.all(
    top.map(async (s): Promise<FinderResult> => {
      const sites = recruitingSites(s, input.city);
      const { lines, linesStatus } = await linesFor(s);
      return {
        nctId: s.nctId,
        title: s.title,
        phase: phaseLabel(s.phases),
        status: statusLabel(s.overallStatus),
        sites,
        cities: [...new Set(sites.map((x) => x.city))],
        lines,
        linesStatus,
        prescreenHref: links.get(s.nctId) ?? null,
      };
    }),
  );

  console.log(
    `[find] ${results.length} studies (${searches.map((x) => `${x.locn}: ${x.returned}`).join("; ")}); ` +
      `${usage.calls} model calls, ${usage.prompt_tokens} in, ${usage.completion_tokens} out; ${cacheHits} from cache`,
  );
  return { input, widened, searches, results, usage, modelCalls: usage.calls, cacheHits };
}
