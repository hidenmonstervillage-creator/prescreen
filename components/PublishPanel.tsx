"use client";

import { useState } from "react";
import { ErrorLine, Spinner } from "./Icons";
import { buttonClass, focusRing, sectionLabel } from "./ui";

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
    <section data-publish-panel className="flex flex-col gap-3 lg:min-w-[22rem] lg:items-end">
      {url ? (
        <div className="lg:text-right">
          <p className={sectionLabel}>Published</p>
          <a
            href={url}
            className={`mt-1 block break-all rounded-sm font-mono text-body font-medium text-link underline underline-offset-2 hover:text-link-hover ${focusRing}`}
            data-public-link
            target="_blank"
            rel="noreferrer"
          >
            {url}
          </a>
        </div>
      ) : (
        <button
          type="button"
          onClick={publish}
          disabled={busy}
          aria-busy={busy}
          className={`${buttonClass("primary")} w-full lg:w-auto lg:min-w-[14rem]`}
          data-publish
        >
          {busy && <Spinner />}
          {busy ? "Publishing..." : "Publish"}
        </button>
      )}
      <a
        href={`/site/trials/${trialId}/kit`}
        target="_blank"
        rel="noreferrer"
        className={`${buttonClass("secondary")} w-full lg:w-auto lg:min-w-[14rem]`}
        data-download-kit
      >
        Download kit
      </a>
      {!url && <p className="text-small text-ink-secondary lg:text-right">Publish creates the public pre-screen page.</p>}
      {error && <ErrorLine>{error}</ErrorLine>}
    </section>
  );
}
