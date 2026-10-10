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
    return (
      <p className="text-body text-ink-secondary">
        Not asked: {criterion.not_askable_reason ?? "for the site team"}
      </p>
    );
  }
  if (!row.question_id && !row.quoted_answer) {
    return <p className="text-body text-ink-secondary">No question covers this criterion.</p>;
  }
  return (
    <div className="space-y-2">
      {q && (
        <p className="text-small text-ink-secondary">
          <span className="font-mono font-medium">{q.id}</span> {q.text}
        </p>
      )}
      {row.quoted_answer ? (
        <blockquote className="rounded-r-md border-l-4 border-evidence-line bg-evidence-tint px-3 py-1.5 text-[18px] font-medium leading-7 text-ink">
          &ldquo;{answerLabel(q, row.quoted_answer)}&rdquo;
        </blockquote>
      ) : (
        <p className="text-body text-ink-secondary">No answer given.</p>
      )}
    </div>
  );
}
