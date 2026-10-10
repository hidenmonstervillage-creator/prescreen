import Link from "next/link";
import type { LeadPack } from "@/lib/pack";
import { formatDate, formatDay } from "@/lib/format";
import CountsLine from "./CountsLine";
import CriteriaMatrix from "./CriteriaMatrix";
import PackFooter from "./PackFooter";
import { buttonClass, cardClass, focusRing, nctClass, sectionLabel } from "./ui";

/**
 * The lead pack before download: the same patients, in the same order, with the same content
 * as the PDF, one card per patient. Download only; nothing is sent.
 */
export default function LeadPackPreview({ pack, downloadHref }: { pack: LeadPack; downloadHref: string }) {
  const total = pack.patients.length;
  return (
    <div data-pack-preview={pack.trial.id}>
      <p className="mb-2">
        <Link href="/site/inbox" className={`rounded-sm text-body font-semibold text-link hover:text-link-hover hover:underline ${focusRing}`}>
          <span aria-hidden="true">&larr;</span> Back to hospital inbox
        </Link>
      </p>
      <section className={`${cardClass} flex flex-wrap items-start justify-between gap-x-8 gap-y-4 px-6 py-5`}>
        <div className="min-w-0 flex-1">
          <p className={sectionLabel}>Lead pack preview</p>
          <h1 className="mt-1 text-title text-ink">{pack.trial.title}</h1>
          <p className="mt-1 text-body text-ink-secondary">
            <span className={`text-[17px] text-ink ${nctClass}`}>{pack.trial.nct_id}</span> &middot; Hospital: {pack.hospital} &middot;
            Date: {formatDay(pack.created_at)}
          </p>
          <p className="mt-2 text-body text-ink">
            {total} {total === 1 ? "patient" : "patients"}: referral-ready, confirmed by a coordinator, with consent recorded. Each
            patient gets an A4 page of their own.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <a href={downloadHref} download className={buttonClass("primary", "lg")} data-download-pack>
            Download PDF
          </a>
          <span className="text-small text-ink-secondary">Download only. Nothing is sent.</span>
        </div>
      </section>
      <ol className="mt-6 space-y-8">
        {pack.patients.map((p, i) => (
          <li key={p.submission_id} className={`${cardClass} px-6 py-5`} data-pack-patient={p.submission_id}>
            <p className={sectionLabel}>
              Patient {i + 1} of {total}
            </p>
            <p className="mt-1 text-heading text-ink" data-contact>
              {p.contact}
            </p>
            <p className="mt-1 text-body text-ink-secondary">
              Consent given: {formatDate(p.consent_at)} &middot; Submitted: {formatDate(p.submitted_at)} &middot; Confirmed by
              coordinator: {formatDate(p.confirmed_at)}
            </p>
            <div className="my-4">
              <CountsLine rows={p.rows} />
            </div>
            <CriteriaMatrix rows={p.rows} criteria={pack.trial.criteria} questions={pack.trial.questions} />
            <PackFooter />
          </li>
        ))}
      </ol>
    </div>
  );
}
