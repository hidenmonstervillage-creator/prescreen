"use client";

import { useState } from "react";
import type { Trial } from "@/lib/trials";
import CriteriaChecklist from "./CriteriaChecklist";
import QuestionList from "./QuestionList";
import SourceText from "./SourceText";
import GenerationSummary from "./GenerationSummary";
import TrialSummary from "./TrialSummary";
import PublishPanel from "./PublishPanel";

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
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3" data-nct-form>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">NCT ID</span>
          <input
            value={nct}
            onChange={(e) => setNct(e.target.value)}
            placeholder="NCT00000000"
            className="w-48 rounded border border-gray-300 px-3 py-2 font-mono"
            data-nct-input
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy || !nct.trim()}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          data-fetch-generate
        >
          {busy ? "Working..." : "Fetch and generate"}
        </button>
        {busy && (
          <p className="text-sm text-gray-600" data-busy>
            Fetching from ClinicalTrials.gov and writing the checklist and questions. This can take a minute.
          </p>
        )}
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-700" data-error>
          {error}
        </p>
      )}
      {trial && (
        <div className="space-y-4" data-trial-id={trial.id}>
          <TrialSummary trial={trial} />
          {reused && <p className="text-sm text-gray-600">This trial was generated before; showing the stored version.</p>}
          <GenerationSummary report={trial.generation} criteria={trial.criteria} />
          <PublishPanel trialId={trial.id} initialSlug={trial.published_at ? trial.slug : null} />
          <div className="grid gap-4 lg:grid-cols-3">
            <CriteriaChecklist criteria={trial.criteria} questions={trial.questions} />
            <QuestionList questions={trial.questions} />
            <SourceText text={trial.raw_eligibility} nctId={trial.nct_id} />
          </div>
        </div>
      )}
    </div>
  );
}
