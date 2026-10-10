import type { Question, QuestionRule } from "@/lib/types";
import { cardClass } from "./ui";

export const TYPE_LABEL: Record<Question["type"], string> = {
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
    <section data-question-list className={`${cardClass} flex min-w-0 flex-col lg:max-h-[78vh]`}>
      <h2 className="border-b border-line px-5 py-3.5 text-heading text-ink">
        Questions <span className="font-normal text-ink-secondary">({questions.length})</span>
      </h2>
      <ol className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
        {questions.map((q) => (
          <li key={q.id} data-question-id={q.id} className="rounded-lg border border-line px-3.5 py-3">
            <p className="text-small text-ink-secondary">
              <span className="font-mono font-medium">{q.id}</span> &middot; {TYPE_LABEL[q.type]} &middot; covers{" "}
              <span className="font-mono font-medium">{q.criterion_ids.join(", ")}</span>
            </p>
            <p className="mt-1 text-[17px] font-medium leading-6 text-ink">{q.text}</p>
            {q.options && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {q.options.map((o) => (
                  <li key={o} className="rounded-md border border-line bg-page px-2 py-0.5 text-small text-ink">
                    {o}
                  </li>
                ))}
              </ul>
            )}
            <details className="mt-2 text-small text-ink-secondary">
              <summary className="cursor-pointer select-none font-medium hover:text-ink">How answers are read</summary>
              <ul className="mt-1 space-y-0.5">
                {q.rules.map((r) => (
                  <li key={r.criterion_id}>{ruleText(q, r)}</li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
