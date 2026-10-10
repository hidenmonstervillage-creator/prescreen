// The referral-ready flag: referral_ready = (not_met == 0), computed in code from the counts.
// Not found and needs a clinician are shown as counts and never block it.
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { referralReady, packable } from "@/lib/referral";
import { countStates } from "@/lib/states";
import { mapDeterministic } from "@/lib/mapping";
import type { Answers, Criterion, MappingRow, Question, State } from "@/lib/types";

const FIX = JSON.parse(readFileSync(join(__dirname, "fixtures", "NCT06380751.generated.json"), "utf8")) as {
  criteria: Criterion[];
  questions: Question[];
};

const counts = (met: number, not_met: number, not_found: number, needs_clinician: number): Record<State, number> => ({
  met,
  not_met,
  not_found,
  needs_clinician,
});

describe("referral_ready rule", () => {
  it("zero not met gives true", () => {
    expect(referralReady(counts(12, 0, 7, 15))).toBe(true);
    expect(referralReady(counts(1, 0, 0, 0))).toBe(true);
  });

  it("one not met gives false", () => {
    expect(referralReady(counts(11, 1, 7, 15))).toBe(false);
    expect(referralReady(counts(33, 1, 0, 0))).toBe(false);
  });

  it("not found and needs a clinician counts do not change the result", () => {
    for (const nf of [0, 1, 7, 34]) {
      for (const nc of [0, 1, 15, 34]) {
        expect(referralReady(counts(3, 0, nf, nc))).toBe(true);
        expect(referralReady(counts(3, 1, nf, nc))).toBe(false);
      }
    }
    // A map that is all not found or all needs a clinician is still not blocked.
    expect(referralReady(counts(0, 0, 34, 0))).toBe(true);
    expect(referralReady(counts(0, 0, 0, 34))).toBe(true);
  });

  it("a submission with no map yet has no counts to read, so it is not flagged", () => {
    expect(referralReady(counts(0, 0, 0, 0))).toBe(false);
  });

  it("on the demo rows: A and B are referral-ready, C and the checkpoint row (one not met each) are not", () => {
    const A: Answers = { q1: "Adult female, post-menopausal", q2: "yes" };
    for (let k = 3; k <= 12; k++) A[`q${k}`] = "no";
    const B: Answers = { ...A, q5: "unsure", q8: undefined, q12: undefined };
    const C: Answers = { ...A, q1: "Adult male", q11: "yes" };
    const ready = (a: Answers) => referralReady(countStates(mapDeterministic(FIX.criteria, FIX.questions, a).rows));
    expect(countStates(mapDeterministic(FIX.criteria, FIX.questions, A).rows)).toEqual(counts(12, 0, 7, 15));
    expect(ready(A)).toBe(true);
    expect(ready(B)).toBe(true);
    expect(ready(C)).toBe(false);
    // The checkpoint row as stored: 9 met · 1 not met (e6) · 9 not found · 15 need a clinician.
    expect(referralReady(counts(9, 1, 9, 15))).toBe(false);
  });
});

describe("lead pack selection", () => {
  it("needs referral-ready, coordinator confirmation and consent, all three", () => {
    const all = { referral_ready: true, confirmed_by_coordinator: true, consent_given: true };
    expect(packable(all)).toBe(true);
    expect(packable({ ...all, referral_ready: false })).toBe(false);
    expect(packable({ ...all, confirmed_by_coordinator: false })).toBe(false);
    expect(packable({ ...all, consent_given: false })).toBe(false);
  });
});

// The inbox query computes the counts and both flags per row from the map's states.
const STORED: (Record<string, unknown> & { mappings: Pick<MappingRow, "state">[] })[] = [];
vi.mock("@/lib/supabase", () => ({
  db: () => ({
    from: () => {
      const b = {
        select: () => b,
        order: () => b,
        limit: () => Promise.resolve({ data: STORED, error: null }),
      };
      return b;
    },
  }),
}));

describe("inbox rows", () => {
  it("carry the four counts, referral_ready and packable, computed from the map", async () => {
    const { listSubmissions } = await import("@/lib/trials");
    const states = (spec: [State, number][]) => spec.flatMap(([s, n]) => Array.from({ length: n }, () => ({ state: s })));
    const base = { created_at: "2026-10-10T12:00:00Z", trial: { id: "t", nct_id: "NCT06380751", title: "T" }, consent_at: "2026-10-10T12:00:00Z" };
    STORED.push(
      { ...base, id: "a", contact: "Lora Primerna (fictional patient)", consent_given: true, confirmed_by_coordinator: true, confirmed_at: "2026-10-10T13:00:00Z", mappings: states([["met", 12], ["not_found", 7], ["needs_clinician", 15]]) },
      { ...base, id: "c", contact: "Petar Primerov (fictional patient)", consent_given: true, confirmed_by_coordinator: true, confirmed_at: "2026-10-10T13:00:00Z", mappings: states([["met", 11], ["not_met", 1], ["not_found", 7], ["needs_clinician", 15]]) },
      { ...base, id: "x", contact: "Fictional, no consent", consent_given: false, consent_at: null, confirmed_by_coordinator: true, confirmed_at: "2026-10-10T13:00:00Z", mappings: states([["met", 12], ["not_found", 7], ["needs_clinician", 15]]) },
      { ...base, id: "n", contact: "Fictional, no map", consent_given: true, confirmed_by_coordinator: false, confirmed_at: null, mappings: [] },
    );
    const rows = await listSubmissions();
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(by.a.counts).toEqual(counts(12, 0, 7, 15));
    expect([by.a.referral_ready, by.a.packable]).toEqual([true, true]);
    expect([by.c.referral_ready, by.c.packable]).toEqual([false, false]);
    expect([by.x.referral_ready, by.x.packable]).toEqual([true, false]);
    expect([by.n.referral_ready, by.n.packable]).toEqual([false, false]);
    expect(rows.every((r) => !("mappings" in r))).toBe(true);
  });
});
