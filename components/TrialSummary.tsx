import type { Trial } from "@/lib/trials";
import { nctClass } from "./ui";

/** "RECRUITING" to "Recruiting", "PHASE3" to "Phase 3": display only, the stored value is unchanged. */
function readable(value: string): string {
  const s = value.toLowerCase().replace(/_/g, " ").replace(/^phase(\d)/, "phase $1");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function TrialSummary({ trial }: { trial: Trial }) {
  const s = trial.source;
  const bg = (s.locations ?? []).filter((l) => l.country === "Bulgaria");
  const meta = [s.overallStatus ? readable(s.overallStatus) : "Status unknown", (s.phases ?? []).map(readable).join(", "), s.sponsor]
    .filter(Boolean)
    .join(" · ");
  return (
    <section data-trial-summary className="min-w-0 space-y-1.5">
      <p className="text-body text-ink-secondary">
        <span className={`text-[17px] text-ink ${nctClass}`}>{trial.nct_id}</span> &middot; {meta}
      </p>
      <h2 className="text-heading text-ink">{trial.title}</h2>
      <p className="text-body text-ink-secondary">
        Conditions: {(s.conditions ?? []).join(", ")} &middot; Sex: {s.sex ? readable(s.sex) : "not given"} &middot; Age:{" "}
        {s.minimumAge ?? "no minimum"} to {s.maximumAge ?? "no maximum"}
      </p>
      {bg.length > 0 && (
        <p className="text-body text-ink-secondary">
          Hospitals in Bulgaria: {bg.map((l) => `${l.city} (${(l.status ?? "").toLowerCase().replace(/_/g, " ")})`).join(", ")}
        </p>
      )}
    </section>
  );
}
