// Public submit rate limit: 10 per 10 minutes per address per trial, then 429.
// Runs the real route and lib/rate-limit.ts against an in-memory stand-in for the
// submit_attempts table; trial lookup and storage are stubbed.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type Row = Record<string, unknown> & { created_at: string };
const tables: Record<string, Row[]> = {};

/** The subset of the Supabase query builder lib/rate-limit.ts uses. */
function from(table: string) {
  const filters: ((r: Row) => boolean)[] = [];
  const builder = {
    select: () => builder,
    eq: (col: string, v: unknown) => {
      filters.push((r) => r[col] === v);
      return builder;
    },
    gte: (col: string, v: string) => {
      filters.push((r) => String(r[col]) >= v);
      return builder;
    },
    insert: (row: Record<string, unknown>) => {
      (tables[table] ??= []).push({ ...row, created_at: new Date().toISOString() });
      return Promise.resolve({ error: null });
    },
    then: (resolve: (v: { count: number; error: null }) => unknown) =>
      resolve({ count: (tables[table] ?? []).filter((r) => filters.every((f) => f(r))).length, error: null }),
  };
  return builder;
}

vi.mock("@/lib/supabase", () => ({ db: () => ({ from }) }));

const TRIALS: Record<string, { id: string; nct_id: string; title: string; questions: unknown[]; slug: string }> = {
  "nct06380751-md2jhsjd": { id: "trial-a", nct_id: "NCT06380751", title: "A", questions: [], slug: "nct06380751-md2jhsjd" },
  "nct11111111-bbbbbbbb": { id: "trial-b", nct_id: "NCT11111111", title: "B", questions: [], slug: "nct11111111-bbbbbbbb" },
};
const submitAnswers = vi.fn(async () => ({ submissionId: "s", mapped: true }));
vi.mock("@/lib/trials", () => ({
  getPublishedTrialBySlug: vi.fn(async (slug: string) => TRIALS[slug] ?? null),
  submitAnswers: (...args: unknown[]) => (submitAnswers as (...a: unknown[]) => unknown)(...args),
}));

const { POST } = await import("@/app/api/s/[slug]/submit/route");
const { MAX_SUBMITS, SUBMIT_WINDOW_MINUTES, hashAddress } = await import("@/lib/rate-limit");

function post(slug: string, ip: string, body: unknown = { answers: {}, contact: "Fictional Tester, +359 00 000 0000" }) {
  const req = new Request(`http://localhost/api/s/${slug}/submit`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body: JSON.stringify(body),
  });
  return POST(req, { params: { slug } });
}

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  submitAnswers.mockClear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("public submit rate limit", () => {
  it("allows 10 submissions per address per trial, then answers 429 without storing anything", async () => {
    expect(MAX_SUBMITS).toBe(10);
    expect(SUBMIT_WINDOW_MINUTES).toBe(10);
    for (let k = 0; k < 10; k++) expect((await post("nct06380751-md2jhsjd", "203.0.113.7")).status).toBe(200);
    expect(submitAnswers).toHaveBeenCalledTimes(10);
    const res = await post("nct06380751-md2jhsjd", "203.0.113.7");
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("600");
    expect((await res.json()).error).toBe("Too many submissions from this address. Try again in 10 minutes.");
    expect(submitAnswers).toHaveBeenCalledTimes(10);
  });

  it("counts per trial and per address", async () => {
    for (let k = 0; k < 10; k++) await post("nct06380751-md2jhsjd", "203.0.113.7");
    expect((await post("nct06380751-md2jhsjd", "203.0.113.7")).status).toBe(429);
    expect((await post("nct11111111-bbbbbbbb", "203.0.113.7")).status).toBe(200);
    expect((await post("nct06380751-md2jhsjd", "198.51.100.9")).status).toBe(200);
  });

  it("opens again once the oldest attempts are more than 10 minutes old", async () => {
    for (let k = 0; k < 10; k++) await post("nct06380751-md2jhsjd", "203.0.113.7");
    vi.setSystemTime(new Date("2026-10-10T12:09:59Z"));
    expect((await post("nct06380751-md2jhsjd", "203.0.113.7")).status).toBe(429);
    vi.setSystemTime(new Date("2026-10-10T12:10:01Z"));
    expect((await post("nct06380751-md2jhsjd", "203.0.113.7")).status).toBe(200);
  });

  it("every POST for a published trial counts, also one that fails validation; an unknown page does not", async () => {
    for (let k = 0; k < 10; k++) expect((await post("nct06380751-md2jhsjd", "203.0.113.7", { answers: {} })).status).toBe(400);
    expect((await post("nct06380751-md2jhsjd", "203.0.113.7")).status).toBe(429);
    expect(submitAnswers).not.toHaveBeenCalled();
    for (let k = 0; k < 12; k++) expect((await post("no-such-page-x", "198.51.100.9")).status).toBe(404);
    expect(tables.submit_attempts.filter((r) => r.trial_id === "trial-a")).toHaveLength(10);
    expect(tables.submit_attempts).toHaveLength(10);
  });

  it("stores only a keyed hash of the address, separate from the passcode limit's hash", async () => {
    await post("nct06380751-md2jhsjd", "203.0.113.7");
    const row = tables.submit_attempts[0];
    expect(JSON.stringify(row)).not.toContain("203.0.113.7");
    expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashAddress("203.0.113.7", "s", "submit")).not.toBe(hashAddress("203.0.113.7", "s", "login"));
    expect(hashAddress("203.0.113.7", "s")).toBe(hashAddress("203.0.113.7", "s", "login"));
  });
});
