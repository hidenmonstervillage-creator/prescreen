import type { FinderInput } from "@/lib/finder";

/** Plain GET form: the search lives in the URL, so a result list can be reopened or shared. */
export default function FinderForm({ values, errors }: { values: FinderInput; errors: string[] }) {
  return (
    <form method="get" action="/find" className="mt-6 space-y-3" data-find-form>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Condition</span>
          <input
            name="condition"
            defaultValue={values.condition}
            placeholder="breast cancer"
            maxLength={120}
            required
            className="rounded border border-gray-300 px-3 py-2"
            data-find-condition
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">
            Stage or markers <span className="font-normal text-gray-500">(optional)</span>
          </span>
          <input
            name="markers"
            defaultValue={values.markers}
            placeholder="metastatic, BRCA2"
            maxLength={120}
            className="rounded border border-gray-300 px-3 py-2"
            data-find-markers
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">City</span>
          <input
            name="city"
            defaultValue={values.city}
            placeholder="Plovdiv"
            maxLength={60}
            required
            className="rounded border border-gray-300 px-3 py-2"
            data-find-city
          />
        </label>
      </div>
      <p className="text-xs text-gray-600">Search terms only. Do not enter the patient&rsquo;s name or other personal details.</p>
      <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white" data-find-submit>
        Search
      </button>
      {errors.length > 0 && (
        <p role="alert" className="text-sm text-red-700">
          {errors.join(" ")}
        </p>
      )}
    </form>
  );
}
