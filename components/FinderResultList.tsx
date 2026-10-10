import type { FinderOutcome } from "@/lib/finder";
import FinderResult from "./FinderResult";

export default function FinderResultList({ outcome }: { outcome: FinderOutcome }) {
  const { input, results, widened, searches } = outcome;
  const terms = input.markers ? `${input.condition} ${input.markers}` : input.condition;
  const cityTotal = searches[0]?.total ?? null;
  if (!results.length) {
    return (
      <p className="mt-6 text-sm text-gray-700" data-find-empty>
        No recruiting study with a site in Bulgaria matched &ldquo;{terms}&rdquo;. Try a broader condition, or leave out the stage or
        markers.
      </p>
    );
  }
  return (
    <section className="mt-6" data-find-results>
      <p className="text-sm text-gray-700" data-find-summary>
        {results.length} recruiting {results.length === 1 ? "study" : "studies"} for &ldquo;{terms}&rdquo; near {input.city}
        {cityTotal !== null && !widened && cityTotal > results.length ? `, the first ${results.length} of ${cityTotal}` : ""}.
        {widened && ` Fewer than 3 matched in ${input.city}, so studies with sites elsewhere in Bulgaria are included.`}
      </p>
      <div className="mt-3 space-y-4">
        {results.map((r) => (
          <FinderResult key={r.nctId} result={r} />
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-500">Study details from ClinicalTrials.gov. Staff contact details are never shown here.</p>
    </section>
  );
}
