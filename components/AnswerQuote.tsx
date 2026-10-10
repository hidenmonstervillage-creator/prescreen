// Shows the question asked and the answer quoted, or why there is no answer.
import type { Criterion, MappingRow, Question } from "@/lib/types";

const YES_NO_LABEL: Record<string, string> = { yes: "Yes", no: "No", unsure: "Not sure" };

export function answerLabel(q: Question | undefined, value: string): string {
  return q?.type === "yes_no" ? (YES_NO_LABEL[value] ?? value) : value;
}

export default function AnswerQuote({
  row,
  criterion,
  questions,
}: {
  row: MappingRow;
  criterion: Criterion | undefined;
  questions: Question[];
}) {
  const q = questions.find((x) => x.id === row.question_id);
  if (criterion && !criterion.askable) {
    return <span className="text-sm text-gray-600">Not asked: {criterion.not_askable_reason ?? "for the site team"}</span>;
  }
  if (!row.question_id && !row.quoted_answer) {
    return <span className="text-sm text-gray-600">No question covers this criterion.</span>;
  }
  return (
    <div className="space-y-1 text-sm">
      {q && (
        <p className="text-gray-600">
          <span className="font-medium">{q.id}:</span> {q.text}
        </p>
      )}
      {row.quoted_answer ? (
        <blockquote className="border-l-2 border-gray-300 pl-2 text-gray-900">
          &ldquo;{answerLabel(q, row.quoted_answer)}&rdquo;
        </blockquote>
      ) : (
        <p className="text-gray-600">No answer given.</p>
      )}
    </div>
  );
}
