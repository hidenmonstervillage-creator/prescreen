"use client";

import { useRef, useState } from "react";
import type { PublicQuestion } from "@/lib/types";
import QuestionField from "./QuestionField";
import ConsentField from "./ConsentField";
import { ErrorLine, Spinner } from "./Icons";
import { buttonClass, focusRing } from "./ui";

export const CONFIRMATION_TEXT = "Thank you. The research team will contact you.";

/** Questions per screen: short screens read faster than one long form. Contact and consent get their own last screen. */
const PER_STEP = 4;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export default function PublicForm({ slug, questions }: { slug: string; questions: PublicQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  const groups = chunk(questions, PER_STEP);
  const contactStep = groups.length;
  const onContactStep = step === contactStep;
  const first = step * PER_STEP + 1;
  const last = Math.min(questions.length, first + PER_STEP - 1);

  function goTo(next: number) {
    setStep(next);
    topRef.current?.scrollIntoView({ block: "start" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Enter on an earlier screen moves on; only the last screen sends.
    if (!onContactStep) {
      goTo(step + 1);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/s/${slug}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers, contact, consent }),
    });
    if (res.ok) {
      setDone(true);
      return;
    }
    const body = await res.json().catch(() => null);
    setError([body?.error, ...(body?.details ?? [])].filter(Boolean).join(" ") || "Something went wrong. Please try again.");
    setBusy(false);
  }

  if (done) {
    return (
      <p role="status" className="rounded-xl border border-line bg-surface px-6 py-10 text-title text-ink shadow-card" data-confirmation>
        {CONFIRMATION_TEXT}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" data-public-form data-step={step}>
      <div ref={topRef} className="scroll-mt-6 space-y-3">
        <p className="text-[17px] font-semibold text-ink" aria-live="polite">
          Screen {step + 1} of {contactStep + 1}
          <span className="font-normal text-ink-secondary">
            {" "}
            &middot; {onContactStep ? "your contact details" : `questions ${first} to ${last} of ${questions.length}`}
          </span>
        </p>
        <ol className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: contactStep + 1 }, (_, i) => (
            <li key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-ink" : "bg-line"}`} />
          ))}
        </ol>
        {step === 0 && (
          <p className="pt-2 text-[18px] leading-7 text-ink-secondary">
            Answer what you know. You can choose &ldquo;Not sure&rdquo; or leave a question blank. The research team at the hospital
            reads your answers and contacts you.
          </p>
        )}
      </div>

      {!onContactStep &&
        groups[step].map((q) => (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id] ?? ""}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          />
        ))}

      {onContactStep && (
        <div>
          <label htmlFor="contact-input" className="block text-[22px] font-semibold leading-8 text-ink md:text-[26px] md:leading-9">
            How should the research team contact you?
          </label>
          <p id="contact-help" className="mt-1.5 text-[17px] leading-6 text-ink-secondary">
            Your name and a phone number or email address.
          </p>
          <input
            id="contact-input"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={300}
            aria-describedby="contact-help"
            autoComplete="off"
            className={`mt-3 h-14 w-full rounded-xl border-2 border-control bg-surface px-4 text-[20px] text-ink placeholder:text-ink-muted hover:border-control-hover ${focusRing}`}
            data-contact-input
            required
          />
        </div>
      )}

      {onContactStep && <ConsentField checked={consent} onChange={setConsent} />}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        {step > 0 && (
          <button type="button" onClick={() => goTo(step - 1)} disabled={busy} className={buttonClass("secondary", "lg")} data-back>
            <span aria-hidden="true">&larr;</span> Back
          </button>
        )}
        {onContactStep ? (
          <button
            type="submit"
            disabled={busy || !contact.trim() || !consent}
            aria-busy={busy}
            className={`${buttonClass("primary", "lg")} ml-auto`}
            data-submit
          >
            {busy && <Spinner />}
            {busy ? "Sending..." : "Send to the research team"}
          </button>
        ) : (
          <button type="submit" className={`${buttonClass("primary", "lg")} ml-auto`} data-next>
            Next <span aria-hidden="true">&rarr;</span>
          </button>
        )}
      </div>
      {error && <ErrorLine className="text-body">{error}</ErrorLine>}
    </form>
  );
}
