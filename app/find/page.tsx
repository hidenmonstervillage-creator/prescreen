import { Suspense } from "react";
import type { Metadata } from "next";
import { CtgovError } from "@/lib/ctgov";
import { cleanFinderInput, findTrials, type FinderInput } from "@/lib/finder";
import { finderDeps } from "@/lib/finder-store";
import FinderForm from "@/components/FinderForm";
import FinderResultList from "@/components/FinderResultList";
import { ErrorLine, Spinner } from "@/components/Icons";
import PublicHeader from "@/components/PublicHeader";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata: Metadata = { title: { absolute: "Find a recruiting trial for a patient" } };

type Params = Partial<Record<keyof FinderInput, string | string[]>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Public, no passcode: a door into the per-trial pre-screens, for a doctor with a patient. */
export default function FindPage({ searchParams }: { searchParams: Params }) {
  const values: FinderInput = {
    condition: one(searchParams.condition),
    markers: one(searchParams.markers),
    city: one(searchParams.city),
  };
  const submitted = "condition" in searchParams || "city" in searchParams;
  const parsed = submitted ? cleanFinderInput(values) : null;
  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-content px-5 pb-16 pt-8 md:pt-10">
        <h1 className="text-title text-ink md:text-display">Find a recruiting trial for a patient</h1>
        <p className="mt-3 max-w-4xl text-[17px] leading-7 text-ink-secondary md:text-[19px] md:leading-8">
          Studies recruiting at hospitals in Bulgaria, from ClinicalTrials.gov. When a study is on the platform, the patient answers
          its pre-screen questions, and the research team at the trial site contacts the patient after the pre-screen.
        </p>
        <FinderForm values={values} errors={parsed && !parsed.ok ? parsed.errors : []} searched={Boolean(parsed?.ok)} />
        {parsed?.ok && (
          <Suspense
            key={JSON.stringify(parsed.value)}
            fallback={
              <p role="status" className="mt-8 flex items-center gap-2 text-[17px] font-medium text-ink" data-find-searching>
                <Spinner />
                Searching ClinicalTrials.gov. The first search for a study can take about 20 seconds.
              </p>
            }
          >
            <Results input={parsed.value} />
          </Suspense>
        )}
      </main>
    </>
  );
}

async function Results({ input }: { input: FinderInput }) {
  let outcome;
  try {
    outcome = await findTrials(input, finderDeps);
  } catch (err) {
    console.error(`[find] search failed: ${(err as Error).message}`);
    return (
      <div className="mt-8" data-find-error>
        <ErrorLine className="text-body">
          {err instanceof CtgovError
            ? "ClinicalTrials.gov did not answer. Try again in a minute."
            : "The search did not finish. Try again in a minute."}
        </ErrorLine>
      </div>
    );
  }
  return <FinderResultList outcome={outcome} />;
}
