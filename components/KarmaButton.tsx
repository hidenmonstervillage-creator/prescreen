// The only Karma touchpoint: disabled, calls nothing (CLAUDE.md hard boundaries).
export default function KarmaButton() {
  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <button
        type="button"
        disabled
        data-karma
        className="inline-flex h-12 cursor-not-allowed items-center rounded-lg border border-line bg-surface px-5 text-[17px] font-semibold text-disabled-ink"
      >
        Request records for a full match
      </button>
      <span className="text-small text-ink-secondary">coming: Karma</span>
    </div>
  );
}
