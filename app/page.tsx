import Link from "next/link";
import { buttonClass, sectionLabel } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className={sectionLabel}>Pre-screen</p>
      <h1 className="mt-3 text-display text-ink" data-hero-headline>
        Patients, faster and cheaper, for the people who run clinical trials.
      </h1>
      <p className="mt-4 max-w-2xl text-[19px] leading-8 text-ink-secondary" data-hero-subline>
        Pre-screened patients sourced from inside hospitals, delivered to CROs. The hospital earns a share.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/find" className={`${buttonClass("primary", "lg")} w-full text-center sm:w-auto`} data-nav="find">
          Find a recruiting trial for a patient
        </Link>
        <Link href="/site" className={`${buttonClass("secondary", "lg")} w-full text-center sm:w-auto`} data-nav="site">
          Hospital sign in
        </Link>
        <Link href="/pricing" className={`${buttonClass("secondary", "lg")} w-full text-center sm:w-auto`} data-nav="pricing">
          Pricing
        </Link>
      </div>
    </main>
  );
}
