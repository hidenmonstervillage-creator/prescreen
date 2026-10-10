import type { LinesStatus, PlainLine } from "@/lib/finder";
import { ChevronRight } from "./Icons";
import { focusRing } from "./ui";

const STATUS_NOTE: Partial<Record<LinesStatus, string>> = {
  no_list: "The criteria text has no list to rewrite. Open the study on ClinicalTrials.gov to read it.",
  none_passed: "No plain-word line passed the checks. Open the study on ClinicalTrials.gov to read the criteria.",
  unavailable: "Plain-word lines are not available right now. Open the study on ClinicalTrials.gov to read the criteria.",
};

/** Up to 5 lines, each ending with its criterion id; hover or open a line for the verbatim criterion. */
export default function PlainCriteria({ lines, status }: { lines: PlainLine[]; status: LinesStatus }) {
  const note = STATUS_NOTE[status];
  return (
    <section data-plain-criteria>
      <h3 className="text-small font-semibold text-ink">Top criteria in plain words</h3>
      {lines.length > 0 && (
        <ol className="mt-2 divide-y divide-line overflow-clip rounded-lg border border-line">
          {lines.map((l) => (
            <li key={l.criterion_id} data-criterion-line={l.criterion_id} title={l.quote}>
              <details className="group">
                <summary
                  className={`flex cursor-pointer list-none items-start gap-3 px-3.5 py-3 text-body text-ink hover:bg-page group-open:bg-page [&::-webkit-details-marker]:hidden ${focusRing} focus-visible:outline-offset-[-2px]`}
                >
                  <ChevronRight className="mt-0.5 size-5 text-ink-secondary transition-transform group-open:rotate-90 motion-reduce:transition-none" />
                  <span className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:gap-3">
                    <span className="mt-px shrink-0 rounded-md border border-line bg-surface px-2 text-small font-medium leading-6 text-ink-secondary">
                      {l.section === "inclusion" ? "Inclusion" : "Exclusion"}
                    </span>
                    <span className="min-w-0">
                      {l.text} <span className="whitespace-nowrap font-mono text-small text-ink-secondary">({l.criterion_id})</span>
                    </span>
                  </span>
                </summary>
                <blockquote
                  className="mb-3 ml-3.5 mr-3.5 rounded-r-md border-l-4 border-evidence-line bg-evidence-tint px-3 py-2 text-quote text-ink sm:ml-11"
                  data-criterion-quote
                >
                  &ldquo;{l.quote}&rdquo;
                  <span className="mt-1 block text-small text-ink-secondary">Verbatim from ClinicalTrials.gov, criterion {l.criterion_id}</span>
                </blockquote>
              </details>
            </li>
          ))}
        </ol>
      )}
      {note && <p className="mt-2 text-body text-ink-secondary">{note}</p>}
      {lines.length > 0 && (
        <p className="mt-2 text-small text-ink-secondary">Lines rewritten by a model from the criteria text. Open a line to see its source.</p>
      )}
    </section>
  );
}
