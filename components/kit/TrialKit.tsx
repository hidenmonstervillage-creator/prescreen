import type { Trial } from "@/lib/trials";
import KitChecklist from "./KitChecklist";
import KitQuestionnaire from "./KitQuestionnaire";
import ReferralSheet from "./ReferralSheet";
import PrintButton from "./PrintButton";
import { nctClass, sectionLabel } from "../ui";

/** The download kit, rendered from the trial's stored JSON. Prints as three parts on A4. */
export default function TrialKit({ trial, publicUrl }: { trial: Trial; publicUrl: string | null }) {
  const s = trial.source ?? ({} as Partial<Trial["source"]>);
  const meta = [trial.nct_id, s.sponsor, (s.phases ?? []).join(", ").replace(/PHASE(\d)/g, "Phase $1")].filter(Boolean).join(" · ");
  return (
    <div data-trial-kit={trial.id} className="min-h-screen bg-page print:bg-surface">
      <div className="sticky top-0 z-10 border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className={sectionLabel}>Trial kit</p>
            <p className="text-body text-ink">
              <span className={nctClass}>{trial.nct_id}</span> &middot; coordinator checklist, questionnaire, referral sheet
            </p>
            {!publicUrl && <p className="text-small text-ink-secondary">Not published yet: the referral sheet has no link until it is.</p>}
          </div>
          <PrintButton />
        </div>
      </div>
      <div className="space-y-8 px-4 py-8 print:space-y-0 print:p-0">
        <KitChecklist title={trial.title} meta={meta} criteria={trial.criteria} questions={trial.questions} />
        <KitQuestionnaire title={trial.title} meta={meta} questions={trial.questions} />
        <ReferralSheet
          title={trial.title}
          meta={meta}
          nctId={trial.nct_id}
          conditions={s.conditions ?? []}
          criteria={trial.criteria}
          questions={trial.questions}
          publicUrl={publicUrl}
        />
      </div>
    </div>
  );
}
