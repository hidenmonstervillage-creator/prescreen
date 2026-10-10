"use client";

import { useState } from "react";

export default function PublishPanel({ trialId, initialSlug }: { trialId: string; initialSlug: string | null }) {
  const [slug, setSlug] = useState<string | null>(initialSlug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/site/trials/${trialId}/publish`, { method: "POST" });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.slug) setSlug(body.slug);
    else setError(body?.error ?? "Publish failed.");
    setBusy(false);
  }

  const url = slug ? `${typeof window === "undefined" ? "" : window.location.origin}/s/${slug}` : null;

  return (
    <section data-publish-panel className="flex flex-wrap items-center gap-3">
      {url ? (
        <p className="text-sm">
          Published:{" "}
          <a href={url} className="text-blue-700 underline" data-public-link target="_blank" rel="noreferrer">
            {url}
          </a>
        </p>
      ) : (
        <button
          type="button"
          onClick={publish}
          disabled={busy}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          data-publish
        >
          {busy ? "Publishing..." : "Publish"}
        </button>
      )}
      <button
        type="button"
        disabled
        title="The export is built in the UI session"
        className="cursor-not-allowed rounded border border-gray-300 px-4 py-2 text-sm text-gray-500"
        data-download-kit
      >
        Download kit
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
