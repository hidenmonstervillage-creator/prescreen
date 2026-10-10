import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <h1 className="text-display text-ink">Pre-screen</h1>
      <p className="mt-4 max-w-2xl text-[19px] leading-8 text-ink-secondary">
        Plain-language pre-screen questions for one clinical trial at a time. Every answer is mapped to the trial criterion it
        speaks to, with its source quoted.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/find" className={buttonClass("primary", "lg")} data-nav="find">
          Find a recruiting trial for a patient
        </Link>
        <Link href="/site" className={buttonClass("secondary", "lg")} data-nav="site">
          Site staff sign in
        </Link>
        <Link href="/pricing" className={buttonClass("secondary", "lg")} data-nav="pricing">
          Pricing
        </Link>
      </div>
    </main>
  );
}
