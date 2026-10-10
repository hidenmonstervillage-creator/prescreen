"use client";

import { useState } from "react";

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
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={rebuild} disabled={busy} className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50" data-rebuild-map>
        {busy ? "Building..." : "Build the map"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
