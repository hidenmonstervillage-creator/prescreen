import Link from "next/link";
import DotLight from "@/components/DotLight";
import Wordmark from "@/components/Wordmark";
import { focusRing } from "@/components/ui";

const brandNav = `inline-flex h-10 items-center rounded-lg px-3 text-body font-medium text-brand-ink underline-offset-4 hover:underline ${focusRing}`;

/**
 * The landing hero, Atlas's one brand surface: the dark ground, the light made of dots beside the
 * text (never under it), mist text and one button. Everything past "Hospital sign in" stays light.
 */
export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-brand-ground text-brand-ink" data-brand-surface>
      <header className="h-16">
        <div className="mx-auto flex h-full max-w-content items-center gap-5 px-5">
          <Wordmark onDark />
          <nav aria-label="Main" className="ml-auto flex items-center gap-1">
            <Link href="/pricing" className={brandNav} data-nav="pricing">
              Pricing
            </Link>
            <Link href="/site" className={brandNav} data-nav="site">
              Hospital sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-content flex-1 items-center gap-10 px-5 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:py-20">
        <div className="max-w-4xl">
          <h1 className="text-hero text-brand-ink" style={{ fontSize: "clamp(44px, 6.6vw, 96px)", lineHeight: 1.0625 }} data-hero-headline>
            Patients, faster and cheaper, for the people who run clinical trials.
          </h1>
          <p className="mt-8 max-w-2xl text-[20px] leading-8 text-brand-ink" data-hero-subline>
            Pre-screened patients sourced from inside hospitals, delivered to CROs. The hospital earns a share.
          </p>
          <Link
            href="/find"
            className={`mt-10 inline-flex h-14 w-full items-center justify-center rounded-lg bg-brand-action px-7 text-[18px] font-semibold leading-6 text-brand-action-ink hover:bg-brand-action/85 sm:w-auto ${focusRing}`}
            data-nav="find"
          >
            Find a recruiting trial for a patient
          </Link>
        </div>
        <DotLight className="hidden w-full justify-self-end lg:block" />
      </main>
    </div>
  );
}
