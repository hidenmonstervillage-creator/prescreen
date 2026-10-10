import StateCell from "./StateCell";
import AnswerQuote from "./AnswerQuote";
import type { Criterion, MappingRow, Question } from "@/lib/types";

export default function CriteriaMatrix({
  rows,
  criteria,
  questions,
}: {
  rows: MappingRow[];
  criteria: Criterion[];
  questions: Question[];
}) {
  const byId = new Map(criteria.map((c) => [c.id, c]));
  return (
    <table data-matrix className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-gray-300 text-xs uppercase tracking-wide text-gray-500">
          <th className="py-2 pr-3">Criterion (quoted)</th>
          <th className="py-2 pr-3">State</th>
          <th className="py-2">Answer (quoted)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const c = byId.get(r.criterion_id);
          return (
            <tr key={r.criterion_id} data-criterion-id={r.criterion_id} className="border-b border-gray-200 align-top">
              <td className="py-2 pr-3">
                <p className="text-xs text-gray-500">
                  {r.criterion_id} &middot; {c?.section ?? ""}
                </p>
                <blockquote className="text-sm text-gray-900">&ldquo;{r.quoted_criterion}&rdquo;</blockquote>
              </td>
              <td className="py-2 pr-3" data-state={r.state}>
                <StateCell state={r.state} />
              </td>
              <td className="py-2">
                <AnswerQuote row={r} criterion={c} questions={questions} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
