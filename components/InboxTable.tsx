"use client";

import Link from "next/link";
import { useState } from "react";
import type { InboxRow } from "@/lib/trials";
import { packable } from "@/lib/referral";
import ContactText from "./ContactText";
import CountsLine from "./CountsLine";
import FictionalBadge from "./FictionalBadge";
import ReferralReadyLabel from "./ReferralReadyLabel";
import { ErrorLine } from "./Icons";
import { buttonClass, cardClass, checkClass, focusRing, nctClass, sectionLabel } from "./ui";

/** An inbox row with its submitted date already formatted on the server. */
export type InboxViewRow = InboxRow & { submitted: string };

function withConfirmation(r: InboxViewRow, confirmed: boolean, at: string | null): InboxViewRow {
  const next = { ...r, confirmed_by_coordinator: confirmed, confirmed_at: at };
  return { ...next, packable: packable(next) };
}

const hasMap = (r: InboxRow) => Object.values(r.counts).some((n) => n > 0);

/**
 * Screen 4: one row per submission with its four counts, the referral-ready label and the
 * coordinator's checkbox. "Build lead pack" opens the preview once a referral-ready row is confirmed.
 */
export default function InboxTable({ rows: initial }: { rows: InboxViewRow[] }) {
  const [rows, setRows] = useState(initial);
  const [readyOnly, setReadyOnly] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!rows.length) {
    return (
      <section data-inbox-empty className={`${cardClass} px-6 py-12`}>
        <p className={sectionLabel}>Hospital inbox</p>
        <h2 className="mt-2 text-title text-ink">No submissions yet</h2>
        <p className="mt-2 max-w-prose text-body text-ink-secondary">
          Each answer to a published pre-screen lands here as a criteria map. Publish a trial and share its link to start.
        </p>
        <Link href="/site/trials/new" className={`mt-6 ${buttonClass("secondary")}`}>
          New trial
        </Link>
      </section>
    );
  }

  const shown = readyOnly ? rows.filter((r) => r.referral_ready) : rows;
  const forPack = rows.filter((r) => r.packable).length;

  async function confirm(id: string, confirmed: boolean) {
    setError(null);
    setSaving(id);
    const before = rows;
    setRows((rs) => rs.map((r) => (r.id === id ? withConfirmation(r, confirmed, null) : r)));
    const res = await fetch(`/api/site/submissions/${id}/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmed }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body) {
      setRows((rs) => rs.map((r) => (r.id === id ? withConfirmation(r, body.confirmed_by_coordinator, body.confirmed_at) : r)));
    } else {
      setRows(before);
      setError(body?.error ?? "The confirmation was not saved. Try again.");
    }
    setSaving(null);
  }

  return (
    <div className="space-y-4">
      <section className={`${cardClass} flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-5 py-4`} data-inbox-toolbar>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-body font-semibold text-ink">
            <input
              type="checkbox"
              checked={readyOnly}
              onChange={(e) => setReadyOnly(e.target.checked)}
              className={checkClass}
              data-filter-ready
            />
            Referral-ready only
          </label>
          <p className="text-body text-ink-secondary tabular-nums" aria-live="polite">
            Showing {shown.length} of {rows.length}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="max-w-md text-small text-ink-secondary tabular-nums">
            {forPack > 0
              ? `${forPack} referral-ready ${forPack === 1 ? "row" : "rows"} confirmed by a coordinator, with consent.`
              : "Tick “Confirmed by coordinator” on a referral-ready row to build a pack."}
          </p>
          {forPack > 0 ? (
            <Link href="/site/inbox/pack" className={buttonClass("primary")} data-build-pack>
              Build lead pack
            </Link>
          ) : (
            <button type="button" disabled className={buttonClass("primary")} data-build-pack>
              Build lead pack
            </button>
          )}
        </div>
      </section>
      {error && <ErrorLine className="text-body">{error}</ErrorLine>}
      <div className={`overflow-x-auto ${cardClass}`}>
        <table data-inbox className="w-full border-collapse text-left">
          <thead className="bg-surface-sunken">
            <tr className="text-label uppercase text-ink-secondary">
              <th scope="col" className="px-5 py-3">
                Trial
              </th>
              <th scope="col" className="px-5 py-3">
                Submitted
              </th>
              <th scope="col" className="px-5 py-3">
                Contact
              </th>
              <th scope="col" className="px-5 py-3">
                Criteria map
              </th>
              <th scope="col" className="px-5 py-3">
                Coordinator
              </th>
              <th scope="col" className="px-5 py-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr className="border-t border-line">
                <td colSpan={6} className="px-5 py-6 text-body text-ink-secondary" data-inbox-filtered-empty>
                  No referral-ready submission yet.
                </td>
              </tr>
            )}
            {shown.map((r) => (
              <tr key={r.id} data-submission-id={r.id} className="border-t border-line align-top hover:bg-page">
                <td className="px-5 py-3">
                  <Link
                    href={`/site/inbox/${r.id}`}
                    className={`rounded-sm text-body text-link hover:text-link-hover hover:underline ${nctClass} ${focusRing}`}
                    data-open-submission
                  >
                    {r.trial?.nct_id ?? "Unknown trial"}
                  </Link>
                  <p className="mt-0.5 line-clamp-2 max-w-xs text-small text-ink-secondary">{r.trial?.title}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-body tabular-nums text-ink">{r.submitted}</td>
                <td className="px-5 py-3 text-body text-ink">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <span className="tabular-nums" data-contact>
                      <ContactText contact={r.contact} />
                    </span>
                    <FictionalBadge />
                  </div>
                  {!r.consent_given && <p className="mt-1.5 text-small text-ink-secondary">No consent recorded</p>}
                </td>
                <td className="px-5 py-3">
                  {/* 20rem: the four pills wrap as two rows of two, the same in every row. */}
                  <div className="w-[20rem]">
                    {hasMap(r) ? <CountsLine counts={r.counts} look="pills" /> : <p className="text-body text-ink-secondary">No map yet.</p>}
                  </div>
                  {r.referral_ready && (
                    <p className="mt-2">
                      <ReferralReadyLabel />
                    </p>
                  )}
                </td>
                <td className="px-5 py-3">
                  <label className="inline-flex cursor-pointer items-center gap-2.5 whitespace-nowrap text-body text-ink">
                    <input
                      type="checkbox"
                      checked={r.confirmed_by_coordinator}
                      disabled={saving === r.id}
                      onChange={(e) => confirm(r.id, e.target.checked)}
                      className={checkClass}
                      data-confirm
                    />
                    Confirmed by coordinator
                  </label>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right">
                  <Link href={`/site/inbox/${r.id}`} className={buttonClass("secondary")}>
                    Open map<span className="sr-only"> for {r.trial?.nct_id ?? "this submission"}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
