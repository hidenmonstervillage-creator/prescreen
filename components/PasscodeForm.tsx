"use client";

import { useState } from "react";

export default function PasscodeForm() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/site/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) {
      window.location.href = "/site/inbox";
      return;
    }
    const body = await res.json().catch(() => null);
    setError(body?.error ?? "Sign in failed.");
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" data-passcode-form>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Site passcode</span>
        <input
          type="password"
          autoComplete="current-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
          data-passcode-input
          required
        />
      </label>
      <button
        type="submit"
        disabled={busy || !passcode}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        data-passcode-submit
      >
        {busy ? "Checking..." : "Sign in"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700" data-passcode-error>
          {error}
        </p>
      )}
    </form>
  );
}
