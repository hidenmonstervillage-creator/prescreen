import type { Criterion, Question, Section } from "@/lib/types";
import { askedInMap, criterionStatus } from "../CriteriaChecklist";
import Sheet, { Box } from "./Sheet";

const SECTION_TITLE: Record<Section, string> = { inclusion: "Inclusion criteria", exclusion: "Exclusion criteria" };

/** Kit part (a): every criterion, quoted verbatim, with how the pre-screen covers it. */
export default function KitChecklist({
  title,
  meta,
  criteria,
  questions,
}: {
  title: string;
  meta: string;
  criteria: Criterion[];
  questions: Question[];
}) {
  const askedIn = askedInMap(questions);
  return (
    <Sheet part="checklist" label="Part 1 · Coordinator checklist" title={title} meta={meta} first>
      <p className="text-small text-ink-secondary">
        {criteria.length} criteria, each quoted verbatim from ClinicalTrials.gov. Tick each line as it is reviewed.
      </p>
      <ol className="mt-3">
        {criteria.map((c, i) => (
          <li key={c.id} className="break-inside-avoid">
            {c.section !== criteria[i - 1]?.section && (
              <h3 className="mb-1 mt-4 border-b border-line pb-1 text-[16px] font-bold">{SECTION_TITLE[c.section]}</h3>
            )}
            <div className="flex gap-3 border-b border-line py-2">
              <Box />
              <span className="w-8 shrink-0 font-mono text-small font-medium">{c.id}</span>
              <div className="min-w-0 flex-1">
                {c.parent_quote && <p className="text-small text-ink-secondary">&ldquo;{c.parent_quote}&rdquo;</p>}
                <p className="text-[14px] leading-5">&ldquo;{c.quote}&rdquo;</p>
                <p className="mt-0.5 text-small italic text-ink-secondary">{criterionStatus(c, askedIn)}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}
