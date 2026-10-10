"use client";

import type { PublicQuestion } from "@/lib/types";
import { focusRing } from "./ui";

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure" },
];

const field = `rounded-xl border-2 border-control bg-surface px-4 text-[20px] text-ink hover:border-control-hover ${focusRing}`;

export default function QuestionField({
  question,
  value,
  onChange,
}: {
  question: PublicQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  const name = `answer-${question.id}`;
  const radios = question.type === "yes_no" ? YES_NO : (question.options ?? []).map((o) => ({ value: o, label: o }));
  return (
    <fieldset data-question-id={question.id} className="space-y-3">
      <legend className="mb-3 text-[22px] font-semibold leading-8 text-ink md:text-[26px] md:leading-9">{question.text}</legend>
      {(question.type === "yes_no" || question.type === "choice") && (
        <div className={question.type === "yes_no" ? "grid gap-2.5 sm:grid-cols-3" : "grid gap-2.5"}>
          {radios.map((r) => (
            <label
              key={r.value}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-line bg-surface px-4 py-2.5 text-[19px] text-ink hover:border-control has-[:checked]:border-selected-line has-[:checked]:bg-selected-tint has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring"
            >
              <input
                type="radio"
                name={name}
                value={r.value}
                checked={value === r.value}
                onChange={() => onChange(r.value)}
                className="size-5 shrink-0 accent-accent"
              />
              {r.label}
            </label>
          ))}
        </div>
      )}
      {question.type === "number" && (
        <input
          type="number"
          inputMode="decimal"
          name={name}
          aria-label={question.text}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-14 w-44 ${field}`}
        />
      )}
      {question.type === "free_text" && (
        <textarea
          name={name}
          aria-label={question.text}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={2000}
          rows={4}
          className={`w-full py-3 leading-8 ${field}`}
        />
      )}
    </fieldset>
  );
}
