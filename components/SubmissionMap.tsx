import Link from "next/link";
import type { SubmissionDetail } from "@/lib/trials";
import { formatDate } from "@/lib/format";
import { countStates } from "@/lib/states";
import { referralReady } from "@/lib/referral";
import CountsLine from "./CountsLine";
import FictionalBadge from "./FictionalBadge";
import KarmaButton from "./KarmaButton";
import CriteriaMatrix from "./CriteriaMatrix";
import RebuildMapButton from "./RebuildMapButton";
import ReferralReadyLabel from "./ReferralReadyLabel";
import SummaryCard from "./SummaryCard";
import { cardClass, nctClass, quietLinkClass } from "./ui";

/** Screen 5: one submission's criteria map. Built for a projector: the states carry it. */
export default function SubmissionMap({ detail: s }: { detail: SubmissionDetail }) {
  return (
    <div data-submission-detail={s.id}>
      <p className="mb-3">
        <Link href="/site/inbox" className={`text-body ${quietLinkClass}`}>
          <span aria-hidden="true">&larr;</span> Back to hospital inbox
        </Link>
      </p>
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className={`text-title text-ink ${nctClass}`}>{s.trial.nct_id}</h1>
        <p className="min-w-0 flex-1 truncate text-body text-ink-secondary" title={s.trial.title}>
          {s.trial.title}
        </p>
      </header>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-body text-ink tabular-nums">
        <span>Submitted {formatDate(s.created_at)}</span>
        <span aria-hidden="true">&middot;</span>
        <span>
          Contact: <span data-contact className="font-semibold">{s.contact}</span>
        </span>
        <FictionalBadge />
        <span aria-hidden="true">&middot;</span>
        <span>Consent: {s.consent_given && s.consent_at ? `given ${formatDate(s.consent_at)}` : "not recorded"}</span>
      </div>
      <section className={`${cardClass} my-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 p-5`}>
        {s.rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <CountsLine rows={s.rows} look="pills" />
            {referralReady(countStates(s.rows)) && <ReferralReadyLabel />}
          </div>
        ) : (
          <p className="text-heading text-ink">This submission has no map yet.</p>
        )}
        <KarmaButton />
      </section>
      {s.rows.length > 0 ? (
        <>
          <CriteriaMatrix rows={s.rows} criteria={s.trial.criteria} questions={s.trial.questions} />
          <SummaryCard rows={s.rows} />
        </>
      ) : (
        <RebuildMapButton submissionId={s.id} />
      )}
    </div>
  );
}
