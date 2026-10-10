"use client";

import { useState } from "react";
import { ErrorLine, Spinner } from "./Icons";
import { buttonClass } from "./ui";

export default function RebuildMapButton({ submissionId }: { submissionId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function rebuild() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/site/submissions/${submissionId}/map`, { method: "POST" });
    if (res.ok) window.location.reload();
    else {
      setError((await res.json().catch(() => null))?.error ?? "Could not build the map.");
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={rebuild} disabled={busy} aria-busy={busy} className={buttonClass("primary")} data-rebuild-map>
        {busy && <Spinner />}
        {busy ? "Building..." : "Build the map"}
      </button>
      {error && <ErrorLine>{error}</ErrorLine>}
    </div>
  );
}
