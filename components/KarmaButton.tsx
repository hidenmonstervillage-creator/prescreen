// The only Karma touchpoint: disabled, calls nothing (CLAUDE.md hard boundaries).
export default function KarmaButton() {
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled
        data-karma
        className="cursor-not-allowed rounded border border-gray-300 bg-gray-100 px-3 py-1.5 text-sm text-gray-500"
      >
        Request records for a full match
      </button>
      <span className="text-xs text-gray-500">coming: Karma</span>
    </div>
  );
}
