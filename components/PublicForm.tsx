"use client";

import { useState } from "react";
import type { PublicQuestion } from "@/lib/types";
import QuestionField from "./QuestionField";

export const CONFIRMATION_TEXT = "Thank you. The site will contact you.";

export default function PublicForm({ slug, questions }: { slug: string; questions: PublicQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/s/${slug}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers, contact }),
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
      <p role="status" className="text-lg" data-confirmation>
        {CONFIRMATION_TEXT}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" data-public-form>
      {questions.map((q) => (
        <QuestionField
          key={q.id}
          question={q}
          value={answers[q.id] ?? ""}
          onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
        />
      ))}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">How should the site contact you?</span>
        <span className="text-xs text-gray-600">Your name and a phone number or email address.</span>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={300}
          className="rounded border border-gray-300 px-3 py-2"
          data-contact-input
          required
        />
      </label>
      <button
        type="submit"
        disabled={busy || !contact.trim()}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        data-submit
      >
        {busy ? "Sending..." : "Send to the site"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
