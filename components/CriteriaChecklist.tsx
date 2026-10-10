import type { Criterion, Question, Section } from "@/lib/types";
import { cardClass, sectionLabel } from "./ui";

const SECTION_TITLE: Record<Section, string> = { inclusion: "Inclusion", exclusion: "Exclusion" };

/** How a criterion is covered: the question that asks it, or why it is left to the research team. */
export function criterionStatus(c: Criterion, askedIn: Map<string, string[]>): string {
  if (!c.askable) return `Not asked: ${c.not_askable_reason ?? "for the research team"}`;
  const qs = askedIn.get(c.id);
  return qs ? `Asked in ${qs.join(", ")}` : "Not asked: no question covers it";
}

/** Criterion id to the ids of the questions that ask it, in question order. */
export function askedInMap(questions: Question[]): Map<string, string[]> {
  const askedIn = new Map<string, string[]>();
  for (const q of questions) for (const id of q.criterion_ids) askedIn.set(id, [...(askedIn.get(id) ?? []), q.id]);
  return askedIn;
}

export default function CriteriaChecklist({ criteria, questions }: { criteria: Criterion[]; questions: Question[] }) {
  const askedIn = askedInMap(questions);
  return (
    <section data-checklist className={`${cardClass} flex min-w-0 flex-col lg:max-h-[78vh]`}>
      <h2 className="border-b border-line px-5 py-3.5 text-heading text-ink">
        Checklist <span className="font-normal text-ink-secondary tabular-nums">({criteria.length} criteria)</span>
      </h2>
      <ol className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
        {criteria.map((c, i) => (
          <li key={c.id} data-criterion-id={c.id} className="space-y-1.5">
            {c.section !== criteria[i - 1]?.section && (
              <p className={`${sectionLabel} ${i > 0 ? "pt-3" : ""}`}>{SECTION_TITLE[c.section]}</p>
            )}
            <div className="rounded-lg border border-line px-3.5 py-3">
              <p className="font-mono text-small font-medium text-ink-secondary">{c.id}</p>
              {c.parent_quote && <p className="mt-0.5 text-small text-ink-secondary">&ldquo;{c.parent_quote}&rdquo;</p>}
              <blockquote className="mt-0.5 text-quote text-ink">&ldquo;{c.quote}&rdquo;</blockquote>
              <p
                className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-small font-medium ${
                  c.askable && askedIn.has(c.id) ? "border-line-strong bg-surface text-ink" : "border-transparent bg-surface-sunken text-ink-secondary"
                }`}
                data-criterion-status
              >
                {criterionStatus(c, askedIn)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
