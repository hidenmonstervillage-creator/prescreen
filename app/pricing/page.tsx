import type { Metadata } from "next";
import Link from "next/link";
import { cardClass, focusRing, sectionLabel } from "@/components/ui";
import { FREE_TRIAL_DAYS, SITE_PRICE_EUR, SPONSOR_PRICE_EUR, euros } from "./prices";

export const metadata: Metadata = { title: "Pricing · Pre-screen" };

const PLANS = [
  {
    id: "site",
    audience: "For sites",
    price: SITE_PRICE_EUR,
    unit: "per active trial per month",
    points: [
      "Checklist and plain-language questions from the trial's ClinicalTrials.gov criteria",
      "A public pre-screen page for the trial",
      "An inbox with a criteria map for every submission",
      "A download kit for coordinators and local doctors",
    ],
  },
  {
    id: "sponsor",
    audience: "For sponsors",
    price: SPONSOR_PRICE_EUR,
    unit: "per trial per month across all its sites",
    points: ["Everything a site gets, for every site running the trial"],
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-content px-6 py-12 md:py-16">
      <Link href="/" className={`rounded-sm text-body font-semibold text-link hover:text-link-hover hover:underline ${focusRing}`}>
        Pre-screen
      </Link>
      <h1 className="mt-4 text-display text-ink">Pricing</h1>
      <p className="mt-3 text-[19px] leading-8 text-ink-secondary">
        First trial free for {FREE_TRIAL_DAYS} days. Cancel any time.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {PLANS.map((p) => (
          <section key={p.id} data-plan={p.id} className={`${cardClass} flex flex-col px-8 py-8`}>
            <h2 className={sectionLabel}>{p.audience}</h2>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-hero tabular-nums text-ink" data-price>
                {euros(p.price)}
              </span>{" "}
              <span className="text-heading font-medium text-ink-secondary">{p.unit}</span>
            </p>
            <ul className="mt-6 space-y-2.5 border-t border-line pt-6 text-[17px] leading-7 text-ink">
              {p.points.map((pt) => (
                <li key={pt} className="flex gap-3">
                  <span aria-hidden="true" className="mt-3 size-1.5 shrink-0 rounded-full bg-ink" />
                  {pt}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
