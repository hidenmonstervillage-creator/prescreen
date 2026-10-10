"use client";

import { useState } from "react";
import type { Trial } from "@/lib/trials";
import CriteriaChecklist from "./CriteriaChecklist";
import QuestionList from "./QuestionList";
import SourceText from "./SourceText";
import GenerationSummary from "./GenerationSummary";
import TrialSummary from "./TrialSummary";
import PublishPanel from "./PublishPanel";
import { ErrorLine, Spinner } from "./Icons";
import { buttonClass, cardClass, focusRing, helpClass, labelClass } from "./ui";

export default function NewTrial() {
  const [nct, setNct] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trial, setTrial] = useState<Trial | null>(null);
  const [reused, setReused] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setTrial(null);
    const res = await fetch("/api/site/trials", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nct }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.trial) {
      setTrial(body.trial);
      setReused(Boolean(body.reused));
    } else setError(body?.error ?? `Request failed (${res.status}).`);
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className={`${cardClass} flex flex-wrap items-end gap-4 px-6 py-5`} data-nct-form>
        <div>
          <label htmlFor="nct-input" className={labelClass}>
            NCT ID
          </label>
          <input
            id="nct-input"
            value={nct}
            onChange={(e) => setNct(e.target.value)}
            placeholder="NCT00000000"
            aria-describedby="nct-help"
            className={`mt-1.5 h-14 w-72 rounded-lg border border-control bg-surface px-4 font-mono text-[22px] font-medium text-ink placeholder:text-ink-muted hover:border-control-hover ${focusRing}`}
            data-nct-input
            required
          />
        </div>
        <button
          type="submit"
          disabled={busy || !nct.trim()}
          aria-busy={busy}
          className={buttonClass(trial ? "secondary" : "primary", "lg")}
          data-fetch-generate
        >
          {busy && <Spinner />}
          {busy ? "Working..." : "Fetch and generate"}
        </button>
        <p id="nct-help" className={`${helpClass} basis-full`}>
          The checklist and questions are written from the trial&rsquo;s criteria on ClinicalTrials.gov. Every line quotes its source.
        </p>
        {busy && (
          <p role="status" className="flex basis-full items-center gap-2 text-body font-medium text-ink" data-busy>
            <Spinner />
            Fetching from ClinicalTrials.gov and writing the checklist and questions. This can take a minute.
          </p>
        )}
      </form>
      {error && (
        <div data-error>
          <ErrorLine className="text-body">{error}</ErrorLine>
        </div>
      )}
      {trial && (
        <div className="space-y-5" data-trial-id={trial.id}>
          <section className={`${cardClass} grid items-start gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_auto]`}>
            <TrialSummary trial={trial} />
            <PublishPanel trialId={trial.id} initialSlug={trial.published_at ? trial.slug : null} />
          </section>
          {reused && <p className="text-body text-ink-secondary">This trial was generated before; showing the stored version.</p>}
          <GenerationSummary report={trial.generation} criteria={trial.criteria} />
          <div className="grid items-start gap-5 lg:grid-cols-3">
            <CriteriaChecklist criteria={trial.criteria} questions={trial.questions} />
            <QuestionList questions={trial.questions} />
            <SourceText text={trial.raw_eligibility} nctId={trial.nct_id} />
          </div>
        </div>
      )}
    </div>
  );
}
