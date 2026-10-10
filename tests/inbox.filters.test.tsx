// Inbox filters (UI only, no schema): a trial dropdown, free text over contact and trial title, and
// readiness. They combine, and the count line says "Showing N of M". Rows are fictional.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import InboxTable, { NO_FILTERS, READINESS_OPTIONS, filterInboxRows, inboxTrials, type InboxViewRow } from "@/components/InboxTable";

const SARU = { id: "t1", nct_id: "NCT06380751", title: "Saruparib (AZD5305) plus camizestrant in advanced breast cancer" };
const FICLA = { id: "t2", nct_id: "NCT06064877", title: "Ficlatuzumab with cetuximab in head and neck cancer" };

function row(id: string, over: Partial<InboxViewRow>): InboxViewRow {
  return {
    id,
    created_at: "2026-10-10T12:02:49Z",
    submitted: "10 Oct 2026, 15:02",
    contact: `Fictional ${id} (fictional patient), +359 00 000 0000`,
    trial: SARU,
    consent_given: true,
    consent_at: "2026-10-10T12:02:49Z",
    confirmed_by_coordinator: false,
    confirmed_at: null,
    counts: { met: 12, not_met: 0, not_found: 7, needs_clinician: 15 },
    referral_ready: true,
    packable: false,
    ...over,
  };
}

const A = row("lora", { contact: "Lora Primerna (fictional patient), +359 00 000 0001", confirmed_by_coordinator: true, confirmed_at: "2026-10-10T18:40:00Z", packable: true });
const B = row("vesela", { contact: "Vesela Izmislena (fictional patient), +359 00 000 0002" });
const C = row("petar", {
  contact: "Petar Primerov (fictional patient), +359 00 000 0003",
  counts: { met: 11, not_met: 1, not_found: 7, needs_clinician: 15 },
  referral_ready: false,
});
const D = row("other", { trial: FICLA, contact: "Iva Izmislena (fictional patient), +359 00 000 0004", referral_ready: false, counts: { met: 0, not_met: 0, not_found: 0, needs_clinician: 0 } });
const ROWS = [A, B, C, D];
const ids = (rs: InboxViewRow[]) => rs.map((r) => r.id);

describe("inbox filters", () => {
  it("readiness: all, referral-ready, referral-ready and confirmed, not referral-ready", () => {
    expect(READINESS_OPTIONS.map((o) => o.label)).toEqual(["All", "Referral-ready", "Referral-ready and confirmed", "Not referral-ready"]);
    expect(ids(filterInboxRows(ROWS, { ...NO_FILTERS, readiness: "all" }))).toEqual(["lora", "vesela", "petar", "other"]);
    expect(ids(filterInboxRows(ROWS, { ...NO_FILTERS, readiness: "ready" }))).toEqual(["lora", "vesela"]);
    expect(ids(filterInboxRows(ROWS, { ...NO_FILTERS, readiness: "ready_confirmed" }))).toEqual(["lora"]);
    expect(ids(filterInboxRows(ROWS, { ...NO_FILTERS, readiness: "not_ready" }))).toEqual(["petar", "other"]);
  });

  it("trial: only trials with submissions, once each", () => {
    expect(inboxTrials(ROWS).map((t) => t.nct_id)).toEqual(["NCT06064877", "NCT06380751"]);
    expect(ids(filterInboxRows(ROWS, { ...NO_FILTERS, trial: "t2" }))).toEqual(["other"]);
  });

  it("free text: contact and trial title (and NCT ID), any case, every word", () => {
    expect(ids(filterInboxRows(ROWS, { ...NO_FILTERS, text: "izmislena" }))).toEqual(["vesela", "other"]);
    expect(ids(filterInboxRows(ROWS, { ...NO_FILTERS, text: "0003" }))).toEqual(["petar"]);
    expect(ids(filterInboxRows(ROWS, { ...NO_FILTERS, text: "cetuximab" }))).toEqual(["other"]);
    expect(ids(filterInboxRows(ROWS, { ...NO_FILTERS, text: "saruparib lora" }))).toEqual(["lora"]);
    expect(ids(filterInboxRows(ROWS, { ...NO_FILTERS, text: "nct06380751" }))).toEqual(["lora", "vesela", "petar"]);
  });

  it("the three combine", () => {
    expect(ids(filterInboxRows(ROWS, { trial: "t1", text: "prim", readiness: "ready" }))).toEqual(["lora"]);
    expect(ids(filterInboxRows(ROWS, { trial: "t1", text: "prim", readiness: "not_ready" }))).toEqual(["petar"]);
    expect(ids(filterInboxRows(ROWS, { trial: "t2", text: "", readiness: "ready" }))).toEqual([]);
  });

  it("renders the three controls with their hooks, the count line and the empty message", () => {
    const all = renderToStaticMarkup(<InboxTable rows={ROWS} />);
    expect(all).toMatch(/<select[^>]*data-filter-trial/);
    expect(all).toMatch(/<input[^>]*type="search"[^>]*data-filter-search/);
    expect(all).toMatch(/<select[^>]*data-filter-ready/);
    expect(all).toContain("All trials (2)");
    expect(all).toContain("NCT06064877 · Ficlatuzumab with cetuximab in head and neck cancer");
    expect(all).toMatch(/data-inbox-count[^>]*>Showing 4 of 4</);
    expect(all).not.toContain("data-filter-clear");
    expect(all.match(/data-submission-id=/g)).toHaveLength(4);

    const some = renderToStaticMarkup(<InboxTable rows={ROWS} filters={{ trial: "t1", text: "", readiness: "ready" }} />);
    expect(some).toContain("Showing 2 of 4");
    expect(some.match(/data-submission-id=/g)).toHaveLength(2);
    expect(some).toContain("Clear filters");
    // The pack count is over all rows, not the filtered ones.
    expect(some).toContain("1 referral-ready row confirmed by a coordinator, with consent.");

    const none = renderToStaticMarkup(<InboxTable rows={ROWS} filters={{ trial: "t2", text: "", readiness: "ready" }} />);
    expect(none).toContain("Showing 0 of 4");
    expect(none).toContain("No submission matches these filters.");
  });
});
