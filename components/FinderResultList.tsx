import type { FinderOutcome } from "@/lib/finder";
import FinderResult from "./FinderResult";
import { cardClass } from "./ui";

export default function FinderResultList({ outcome }: { outcome: FinderOutcome }) {
  const { input, results, widened, searches } = outcome;
  const terms = input.markers ? `${input.condition} ${input.markers}` : input.condition;
  const cityTotal = searches[0]?.total ?? null;
  if (!results.length) {
    return (
      <p className={`${cardClass} mt-8 px-6 py-5 text-[17px] leading-7 text-ink`} data-find-empty>
        No recruiting study at a hospital in Bulgaria was found for &ldquo;{terms}&rdquo;. Try a broader condition, or leave out the
        stage or markers.
      </p>
    );
  }
  return (
    <section className="mt-8" data-find-results>
      <p className="text-[17px] leading-7 text-ink" data-find-summary>
        {results.length} recruiting {results.length === 1 ? "study" : "studies"} for &ldquo;{terms}&rdquo; near {input.city}
        {cityTotal !== null && !widened && cityTotal > results.length ? `, the first ${results.length} of ${cityTotal}` : ""}.
        {widened && ` Fewer than 3 found in ${input.city}, so studies at hospitals elsewhere in Bulgaria are included.`}
      </p>
      <div className="mt-4 space-y-5">
        {results.map((r) => (
          <FinderResult key={r.nctId} result={r} />
        ))}
      </div>
      <p className="mt-5 text-small text-ink-secondary">Study details from ClinicalTrials.gov. Staff contact details are never shown here.</p>
    </section>
  );
}
