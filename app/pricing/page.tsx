import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import { cardClass, sectionLabel } from "@/components/ui";
import { PRINCIPLE_LINE } from "@/lib/copy";
import { FREE_LEADS_PER_HOSPITAL, TRIAL_PLAN_EUR, euros } from "./prices";

export const metadata: Metadata = { title: "Pricing · Pre-screen" };

/** Three cards: who pays what. [X], [Z], [N] and [Y] are placeholders, shown as written. */
const PLANS = [
  {
    id: "cro",
    audience: "CRO",
    headline: "Pay per pre-screened lead delivered.",
    points: [
      "€[X] per lead, plus €[Z] when the patient enrols.",
      `Trial plan: ${euros(TRIAL_PLAN_EUR)} per trial per month, [N] leads included, success fee on top.`,
    ],
  },
  {
    id: "hospital",
    audience: "Hospital",
    headline: "Pays nothing.",
    points: ["Earns [Y]% of every fee.", "Trial setup free."],
  },
  {
    id: "patient",
    audience: "Patient",
    headline: "Free.",
    points: [],
  },
];

export default function PricingPage() {
  return (
    <>
      <PublicHeader current="pricing" />
      <main className="mx-auto w-full max-w-content px-5 pb-16 pt-10">
        <h1 className="text-display text-ink">Pricing</h1>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <section key={p.id} data-plan={p.id} className={`${cardClass} flex flex-col p-6`}>
              <h2 className={sectionLabel}>{p.audience}</h2>
              <p className="mt-3 text-title text-ink" data-plan-headline>
                {p.headline}
              </p>
              {p.points.length > 0 && (
                <ul className="mt-5 space-y-2.5 border-t border-line pt-5 text-[17px] leading-7 text-ink tabular-nums">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex gap-3">
                      <span aria-hidden="true" className="mt-3 size-1.5 shrink-0 rounded-full bg-ink" />
                      {pt}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <p className="mt-6 rounded-2xl border border-line bg-surface-sunken px-6 py-5 text-heading text-ink" data-principle>
          {PRINCIPLE_LINE}
        </p>
        <p className="mt-4 text-[17px] leading-7 text-ink-secondary tabular-nums" data-free-leads>
          First {FREE_LEADS_PER_HOSPITAL} leads per hospital free to the CRO.
        </p>
      </main>
    </>
  );
}
