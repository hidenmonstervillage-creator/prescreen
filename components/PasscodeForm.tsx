"use client";

import { useState } from "react";
import { ErrorLine, Spinner } from "./Icons";
import { buttonClass, inputClass, labelClass } from "./ui";

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
    <form onSubmit={onSubmit} className="flex flex-col gap-4" data-passcode-form>
      <div>
        <label htmlFor="passcode-input" className={labelClass}>
          Site passcode
        </label>
        <input
          id="passcode-input"
          type="password"
          autoComplete="current-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={`mt-1.5 ${inputClass} h-12 ${error ? "border-2 border-ink" : ""}`}
          data-passcode-input
          required
        />
      </div>
      <button
        type="submit"
        disabled={busy || !passcode}
        aria-busy={busy}
        className={`${buttonClass("primary")} h-12`}
        data-passcode-submit
      >
        {busy && <Spinner />}
        {busy ? "Checking..." : "Sign in"}
      </button>
      {error && (
        <div data-passcode-error>
          <ErrorLine>{error}</ErrorLine>
        </div>
      )}
    </form>
  );
}
