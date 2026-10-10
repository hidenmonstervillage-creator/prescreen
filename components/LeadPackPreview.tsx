import Link from "next/link";
import { PACK_AUDIENCE_LINE, type LeadPack } from "@/lib/pack";
import { formatDate, formatDay } from "@/lib/format";
import CountsLine from "./CountsLine";
import CriteriaMatrix from "./CriteriaMatrix";
import FictionalBadge from "./FictionalBadge";
import PackFooter from "./PackFooter";
import SummaryCard from "./SummaryCard";
import { buttonClass, cardClass, nctClass, quietLinkClass, sectionLabel } from "./ui";

/**
 * The lead pack before download: the same patients, in the same order, with the same content
 * as the PDF, one card per patient. Download only; nothing is sent.
 */
export default function LeadPackPreview({ pack, downloadHref }: { pack: LeadPack; downloadHref: string }) {
  const total = pack.patients.length;
  return (
    <div data-pack-preview={pack.trial.id}>
      <p className="mb-3">
        <Link href="/site/inbox" className={`text-body ${quietLinkClass}`}>
          <span aria-hidden="true">&larr;</span> Back to hospital inbox
        </Link>
      </p>
      <section className={`${cardClass} flex flex-wrap items-start justify-between gap-x-8 gap-y-4 p-5`}>
        <div className="min-w-0 flex-1">
          <p className={sectionLabel}>Lead pack preview</p>
          <h1 className="mt-1 text-title text-ink">{pack.trial.title}</h1>
          <p className="mt-1 text-body text-ink">{PACK_AUDIENCE_LINE}</p>
          {/* The same line as the PDF (packHeaderLine), with the NCT ID set in mono. */}
          <p className="mt-1 text-body text-ink-secondary tabular-nums">
            Lead pack &middot; <span className={`text-ink ${nctClass}`}>{pack.trial.nct_id}</span> &middot; Referred from: {pack.hospital}{" "}
            &middot; Date: {formatDay(pack.created_at)}
          </p>
          <p className="mt-2 text-body text-ink tabular-nums">
            {total} {total === 1 ? "patient" : "patients"}: referral-ready, confirmed by a coordinator, with consent recorded. Each
            patient gets an A4 page of their own.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <a href={downloadHref} download className={buttonClass("primary")} data-download-pack>
            Download PDF
          </a>
          <span className="text-small text-ink-secondary">Download only. Nothing is sent.</span>
        </div>
      </section>
      <ol className="mt-6 space-y-8">
        {pack.patients.map((p, i) => (
          <li key={p.submission_id} className={`${cardClass} p-5`} data-pack-patient={p.submission_id}>
            <p className={`${sectionLabel} tabular-nums`}>
              Patient {i + 1} of {total}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className="text-heading text-ink tabular-nums" data-contact>
                {p.contact}
              </p>
              <FictionalBadge />
            </div>
            <p className="mt-1 text-body text-ink-secondary tabular-nums">
              Consent given: {formatDate(p.consent_at)} &middot; Submitted: {formatDate(p.submitted_at)} &middot; Confirmed by
              coordinator: {formatDate(p.confirmed_at)}
            </p>
            <div className="my-4">
              <CountsLine rows={p.rows} />
              <SummaryCard rows={p.rows} look="line" />
            </div>
            <CriteriaMatrix rows={p.rows} criteria={pack.trial.criteria} questions={pack.trial.questions} />
            <PackFooter />
          </li>
        ))}
      </ol>
    </div>
  );
}
