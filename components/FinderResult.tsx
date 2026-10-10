import type { FinderResult as Result } from "@/lib/finder";
import PlainCriteria from "./PlainCriteria";
import { buttonClass, cardClass, focusRing, neutralPill, trialIdClass } from "./ui";

/**
 * One study: link, title, phase, status, recruiting hospitals in Bulgaria, plain-word criteria, next step.
 * The next step is the strongest thing on the card and comes straight after the title: beside it from
 * md up, under it on a phone. It is second in the markup too, so keyboard order matches what is seen.
 * `primary`: this card holds the view's one primary button. The recruiting status is a neutral pill.
 */
export default function FinderResult({ result, primary = true }: { result: Result; primary?: boolean }) {
  const r = result;
  return (
    <article
      className={`${cardClass} grid gap-x-8 gap-y-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_17.5rem]`}
      data-trial-nct={r.nctId}
    >
      <header className="min-w-0 md:col-start-1 md:row-start-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-body text-ink-secondary">
          <a
            href={`https://clinicaltrials.gov/study/${r.nctId}`}
            target="_blank"
            rel="noreferrer"
            className={`rounded-sm ${trialIdClass} text-link underline underline-offset-2 hover:text-link-hover ${focusRing}`}
            data-ctgov-link
          >
            {r.nctId}
          </a>
          <span aria-hidden="true">&middot;</span>
          <span>{r.phase}</span>
          <span className={neutralPill} data-trial-status>
            {r.status}
          </span>
        </p>
        <h2 className="mt-1.5 text-heading text-ink md:text-[22px] md:leading-8">{r.title}</h2>
      </header>
      <div className="md:col-start-2 md:row-span-2 md:row-start-1">
        {r.prescreenHref ? (
          <a href={r.prescreenHref} className={`${buttonClass(primary ? "primary" : "secondary")} w-full whitespace-nowrap`} data-prescreen-link>
            Pre-screen patients
          </a>
        ) : (
          <p className="rounded-lg border border-line bg-page px-4 py-3 text-body text-ink-secondary" data-not-on-platform>
            Not on the platform yet.{" "}
            {r.cities.length > 0 ? `Hospitals in Bulgaria: ${r.cities.join(", ")}.` : "No recruiting hospital in Bulgaria is listed."}
          </p>
        )}
      </div>
      <div className="min-w-0 space-y-5 md:col-start-1 md:row-start-2">
        {r.sites.length > 0 ? (
          <div data-sites>
            <p className="text-small font-semibold text-ink">Recruiting hospitals in Bulgaria</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {r.sites.map((s) => (
                <li key={`${s.facility}|${s.city}`} className="rounded-md border border-line bg-page px-2.5 py-1 text-small text-ink">
                  {s.facility}, {s.city}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-body text-ink-secondary" data-sites>
            No hospital in Bulgaria is listed as recruiting.
          </p>
        )}
        <PlainCriteria lines={r.lines} status={r.linesStatus} />
      </div>
    </article>
  );
}
