import type { Trial } from "@/lib/trials";

export default function TrialSummary({ trial }: { trial: Trial }) {
  const s = trial.source;
  const bg = (s.locations ?? []).filter((l) => l.country === "Bulgaria");
  return (
    <section data-trial-summary className="space-y-1">
      <h2 className="text-xl font-semibold">{trial.title}</h2>
      <p className="text-sm text-gray-600">
        {trial.nct_id} &middot; {s.overallStatus ?? "status unknown"} &middot; {(s.phases ?? []).join(", ")} &middot; {s.sponsor}
      </p>
      <p className="text-sm text-gray-600">
        Conditions: {(s.conditions ?? []).join(", ")} &middot; Sex: {s.sex ?? "not given"} &middot; Age: {s.minimumAge ?? "no minimum"} to{" "}
        {s.maximumAge ?? "no maximum"}
      </p>
      {bg.length > 0 && (
        <p className="text-sm text-gray-600">
          Sites in Bulgaria: {bg.map((l) => `${l.city} (${(l.status ?? "").toLowerCase().replace(/_/g, " ")})`).join(", ")}
        </p>
      )}
    </section>
  );
}
