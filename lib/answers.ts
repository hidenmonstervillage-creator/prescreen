// Validates what the public form sends, against the trial's own questions.
import type { Answers, Question } from "./types";
import { YES_NO_ANSWERS } from "./mapping";

export const MAX_FREE_TEXT = 2000;
export const MAX_CONTACT = 300;

export type CleanSubmission = { answers: Answers; contact: string };

const YES_NO_LABEL: Record<string, string> = { yes: "Yes", no: "No", unsure: "Not sure" };

/** A stored answer as the person saw it: yes_no values read as their button labels. */
export function answerLabel(q: Pick<Question, "type"> | undefined, value: string): string {
  return q?.type === "yes_no" ? (YES_NO_LABEL[value] ?? value) : value;
}

export function cleanSubmission(
  questions: Question[],
  raw: unknown,
): { ok: true; value: CleanSubmission } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const body = (raw && typeof raw === "object" ? raw : {}) as { answers?: unknown; contact?: unknown };
  const rawAnswers = (body.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, unknown>;
  const answers: Answers = {};

  for (const q of questions) {
    const v = rawAnswers[q.id];
    if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) continue;
    if (q.type === "yes_no") {
      if (typeof v === "string" && (YES_NO_ANSWERS as readonly string[]).includes(v)) answers[q.id] = v;
      else errors.push(`${q.id}: choose yes, no or not sure`);
    } else if (q.type === "choice") {
      if (typeof v === "string" && (q.options ?? []).includes(v)) answers[q.id] = v;
      else errors.push(`${q.id}: choose one of the options`);
    } else if (q.type === "number") {
      const n = typeof v === "number" ? v : Number(String(v).trim());
      if (Number.isFinite(n) && Math.abs(n) <= 1_000_000) answers[q.id] = n;
      else errors.push(`${q.id}: enter a number`);
    } else {
      const s = String(v).trim();
      if (s.length <= MAX_FREE_TEXT) answers[q.id] = s;
      else errors.push(`${q.id}: keep it under ${MAX_FREE_TEXT} characters`);
    }
  }

  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  if (!contact) errors.push("contact: tell the research team how to reach you");
  else if (contact.length > MAX_CONTACT) errors.push(`contact: keep it under ${MAX_CONTACT} characters`);

  return errors.length ? { ok: false, errors } : { ok: true, value: { answers, contact } };
}
