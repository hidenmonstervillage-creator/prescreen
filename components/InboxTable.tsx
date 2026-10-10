import Link from "next/link";
import type { InboxRow } from "@/lib/trials";
import { formatDate } from "@/lib/format";
import { buttonClass, cardClass, focusRing, nctClass, sectionLabel } from "./ui";

export default function InboxTable({ rows }: { rows: InboxRow[] }) {
  if (!rows.length) {
    return (
      <section data-inbox-empty className={`${cardClass} px-8 py-10`}>
        <p className={sectionLabel}>Inbox</p>
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
  return (
    <div className={`overflow-clip ${cardClass}`}>
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
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-submission-id={r.id} className="border-t border-line align-top hover:bg-page">
              <td className="px-5 py-4">
                <Link
                  href={`/site/inbox/${r.id}`}
                  className={`rounded-sm text-[17px] text-link hover:text-link-hover hover:underline ${nctClass} ${focusRing}`}
                  data-open-submission
                >
                  {r.trial?.nct_id ?? "Unknown trial"}
                </Link>
                <p className="mt-0.5 line-clamp-2 max-w-2xl text-body text-ink-secondary">{r.trial?.title}</p>
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-body tabular-nums text-ink">{formatDate(r.created_at)}</td>
              <td className="px-5 py-4 text-body text-ink">{r.contact}</td>
              <td className="whitespace-nowrap px-5 py-4 text-right">
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
  );
}
