import type { LinesStatus, PlainLine } from "@/lib/finder";

const STATUS_NOTE: Partial<Record<LinesStatus, string>> = {
  no_list: "The criteria text has no list to rewrite. Open the study on ClinicalTrials.gov to read it.",
  none_passed: "No plain-word line passed the checks. Open the study on ClinicalTrials.gov to read the criteria.",
  unavailable: "Plain-word lines are not available right now. Open the study on ClinicalTrials.gov to read the criteria.",
};

/** Up to 5 lines, each ending with its criterion id; hover or open a line for the verbatim criterion. */
export default function PlainCriteria({ lines, status }: { lines: PlainLine[]; status: LinesStatus }) {
  const note = STATUS_NOTE[status];
  return (
    <section className="mt-3" data-plain-criteria>
      <h3 className="text-sm font-semibold">Top criteria in plain words</h3>
      {lines.length > 0 && (
        <ol className="mt-1 space-y-1 text-sm">
          {lines.map((l) => (
            <li key={l.criterion_id} data-criterion-line={l.criterion_id} title={l.quote}>
              <details>
                <summary className="cursor-pointer">
                  <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                    {l.section === "inclusion" ? "Inclusion" : "Exclusion"}
                  </span>
                  {l.text} <span className="text-gray-500">({l.criterion_id})</span>
                </summary>
                <blockquote className="ml-4 mt-1 border-l-2 border-gray-300 pl-2 text-gray-700" data-criterion-quote>
                  &ldquo;{l.quote}&rdquo;
                  <span className="block text-xs text-gray-500">Verbatim from ClinicalTrials.gov, criterion {l.criterion_id}</span>
                </blockquote>
              </details>
            </li>
          ))}
        </ol>
      )}
      {note && <p className="mt-1 text-sm text-gray-600">{note}</p>}
      {lines.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">Lines rewritten by a model from the criteria text. Open a line to see its source.</p>
      )}
    </section>
  );
}
