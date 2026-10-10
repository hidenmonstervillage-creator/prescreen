"use client";

import type { PublicQuestion } from "@/lib/types";

const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure" },
];

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
    <fieldset data-question-id={question.id} className="rounded border border-gray-200 p-3">
      <legend className="px-1 text-sm font-medium text-gray-900">{question.text}</legend>
      {(question.type === "yes_no" || question.type === "choice") && (
        <div className="mt-1 flex flex-col gap-1">
          {radios.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm">
              <input type="radio" name={name} value={r.value} checked={value === r.value} onChange={() => onChange(r.value)} />
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-32 rounded border border-gray-300 px-2 py-1"
        />
      )}
      {question.type === "free_text" && (
        <textarea
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={2000}
          rows={3}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        />
      )}
    </fieldset>
  );
}
