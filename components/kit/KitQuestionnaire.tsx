import type { Question } from "@/lib/types";
import Sheet, { Box, WriteLine } from "./Sheet";

const YES_NO = ["Yes", "No", "Not sure"];

/** Kit part (b): the same questions as the public page, on paper. */
export default function KitQuestionnaire({ title, meta, questions }: { title: string; meta: string; questions: Question[] }) {
  return (
    <Sheet part="questionnaire" label="Part 2 · Pre-screen questionnaire" title={title} meta={meta}>
      <p className="text-[15px] leading-6">
        Answer what you know. You can tick &ldquo;Not sure&rdquo; or leave a question blank. The trial site reads your answers and
        contacts you.
      </p>
      <ol className="mt-3">
        {questions.map((q, i) => {
          const options = q.type === "yes_no" ? YES_NO : q.type === "choice" ? (q.options ?? []) : null;
          return (
            <li key={q.id} className="break-inside-avoid border-b border-line py-3">
              <p className="flex gap-2 text-[15px] font-semibold leading-6">
                <span className="w-6 shrink-0 tabular-nums">{i + 1}.</span>
                <span>{q.text}</span>
              </p>
              {options && (
                <ul className={`mt-2 pl-8 ${q.type === "yes_no" ? "flex flex-wrap gap-x-8 gap-y-1.5" : "space-y-1.5"}`}>
                  {options.map((o) => (
                    <li key={o} className="flex items-start gap-2 text-[14px] leading-5">
                      <Box />
                      {o}
                    </li>
                  ))}
                </ul>
              )}
              {q.type === "number" && (
                <div className="max-w-xs pl-8">
                  <WriteLine label="Answer:" />
                </div>
              )}
              {q.type === "free_text" && (
                <div className="pl-8">
                  <WriteLine />
                  <WriteLine />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-4 break-inside-avoid">
        <p className="text-[15px] font-semibold">How should the site contact you?</p>
        <p className="text-small text-ink-secondary">Your name and a phone number or email address.</p>
        <WriteLine label="Name:" />
        <WriteLine label="Phone or email:" />
      </div>
    </Sheet>
  );
}
