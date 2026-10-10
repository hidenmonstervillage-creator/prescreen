import type { Criterion, Question } from "@/lib/types";

export default function CriteriaChecklist({ criteria, questions }: { criteria: Criterion[]; questions: Question[] }) {
  const askedIn = new Map<string, string>();
  for (const q of questions) for (const id of q.criterion_ids) askedIn.set(id, q.id);
  return (
    <section data-checklist>
      <h2 className="mb-2 text-lg font-semibold">Criteria ({criteria.length})</h2>
      <ol className="space-y-2">
        {criteria.map((c) => (
          <li key={c.id} data-criterion-id={c.id} className="rounded border border-gray-200 p-2">
            <p className="text-xs text-gray-500">
              {c.id} &middot; {c.section}
            </p>
            {c.parent_quote && <p className="text-xs text-gray-500">&ldquo;{c.parent_quote}&rdquo;</p>}
            <blockquote className="text-sm text-gray-900">&ldquo;{c.quote}&rdquo;</blockquote>
            <p className="mt-1 text-xs text-gray-600" data-criterion-status>
              {!c.askable
                ? `Not asked: ${c.not_askable_reason ?? "for the site team"}`
                : askedIn.has(c.id)
                  ? `Asked in ${askedIn.get(c.id)}`
                  : "Not asked: no question covers it"}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
