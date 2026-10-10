import type { FinderResult as Result } from "@/lib/finder";
import PlainCriteria from "./PlainCriteria";

/** One study: link, title, phase, status, recruiting sites in Bulgaria, plain-word criteria, next step. */
export default function FinderResult({ result }: { result: Result }) {
  const r = result;
  return (
    <article className="rounded border border-gray-200 p-4" data-trial-nct={r.nctId}>
      <p className="text-sm">
        <a
          href={`https://clinicaltrials.gov/study/${r.nctId}`}
          target="_blank"
          rel="noreferrer"
          className="text-blue-700 underline"
          data-ctgov-link
        >
          {r.nctId}
        </a>
        <span className="text-gray-600">
          {" "}
          &middot; {r.phase} &middot; {r.status}
        </span>
      </p>
      <h2 className="mt-1 text-lg font-semibold">{r.title}</h2>
      {r.sites.length > 0 ? (
        <div className="mt-2 text-sm" data-sites>
          <p className="font-medium">Recruiting sites in Bulgaria</p>
          <ul className="list-inside list-disc text-gray-700">
            {r.sites.map((s) => (
              <li key={`${s.facility}|${s.city}`}>
                {s.facility}, {s.city}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-sm text-gray-700" data-sites>
          No site in Bulgaria is listed as recruiting.
        </p>
      )}
      <PlainCriteria lines={r.lines} status={r.linesStatus} />
      <div className="mt-4">
        {r.prescreenHref ? (
          <a
            href={r.prescreenHref}
            className="inline-block rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            data-prescreen-link
          >
            Pre-screen this patient
          </a>
        ) : (
          <p className="text-sm text-gray-700" data-not-on-platform>
            Not on the platform yet.{" "}
            {r.cities.length > 0 ? `Sites in Bulgaria: ${r.cities.join(", ")}.` : "No recruiting site in Bulgaria is listed."}
          </p>
        )}
      </div>
    </article>
  );
}
