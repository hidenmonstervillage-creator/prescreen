import { Suspense } from "react";
import type { Metadata } from "next";
import { CtgovError } from "@/lib/ctgov";
import { cleanFinderInput, findTrials, type FinderInput } from "@/lib/finder";
import { finderDeps } from "@/lib/finder-store";
import FinderForm from "@/components/FinderForm";
import FinderResultList from "@/components/FinderResultList";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const metadata: Metadata = { title: "Find a recruiting trial for a patient" };

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
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Find a recruiting trial for a patient</h1>
      <p className="mt-2 text-sm text-gray-700">
        Studies recruiting at sites in Bulgaria, from ClinicalTrials.gov. When a study is on the platform, the patient answers its
        pre-screen questions, and the site contacts the patient after the pre-screen.
      </p>
      <FinderForm values={values} errors={parsed && !parsed.ok ? parsed.errors : []} />
      {parsed?.ok && (
        <Suspense
          key={JSON.stringify(parsed.value)}
          fallback={
            <p className="mt-6 text-sm text-gray-600" data-find-searching>
              Searching ClinicalTrials.gov. The first search for a study can take about 20 seconds.
            </p>
          }
        >
          <Results input={parsed.value} />
        </Suspense>
      )}
    </main>
  );
}

async function Results({ input }: { input: FinderInput }) {
  let outcome;
  try {
    outcome = await findTrials(input, finderDeps);
  } catch (err) {
    console.error(`[find] search failed: ${(err as Error).message}`);
    return (
      <p role="alert" className="mt-6 text-sm text-red-700" data-find-error>
        {err instanceof CtgovError
          ? "ClinicalTrials.gov did not answer. Try again in a minute."
          : "The search did not finish. Try again in a minute."}
      </p>
    );
  }
  return <FinderResultList outcome={outcome} />;
}
