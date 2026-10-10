import type { Question, QuestionRule } from "@/lib/types";

const TYPE_LABEL: Record<Question["type"], string> = {
  yes_no: "yes or no",
  choice: "one choice",
  number: "number",
  free_text: "free text",
};

function ruleText(q: Question, r: QuestionRule): string {
  if (q.type === "number") {
    const range = (g: QuestionRule["confirm_range"]) =>
      g ? `${g.min ?? "any"} to ${g.max ?? "any"}` : "none";
    return `${r.criterion_id}: confirms with ${range(r.confirm_range)}, denies with ${range(r.deny_range)}`;
  }
  if (q.type === "free_text") return `${r.criterion_id}: read from the answer text`;
  const list = (a: string[]) => (a.length ? a.join(", ") : "none");
  return `${r.criterion_id}: confirms with ${list(r.confirm_answers)}; denies with ${list(r.deny_answers)}`;
}

export default function QuestionList({ questions }: { questions: Question[] }) {
  return (
    <section data-question-list>
      <h2 className="mb-2 text-lg font-semibold">Questions ({questions.length})</h2>
      <ol className="space-y-2">
        {questions.map((q) => (
          <li key={q.id} data-question-id={q.id} className="rounded border border-gray-200 p-2">
            <p className="text-xs text-gray-500">
              {q.id} &middot; {TYPE_LABEL[q.type]}
            </p>
            <p className="text-sm text-gray-900">{q.text}</p>
            {q.options && <p className="mt-1 text-xs text-gray-600">Options: {q.options.join(" / ")}</p>}
            <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
              {q.rules.map((r) => (
                <li key={r.criterion_id}>{ruleText(q, r)}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
