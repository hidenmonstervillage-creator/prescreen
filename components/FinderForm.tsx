import type { FinderInput } from "@/lib/finder";
import { ErrorLine } from "./Icons";
import { buttonClass, cardClass, inputClass, labelClass } from "./ui";

const field = `mt-1.5 ${inputClass}`;

/**
 * Plain GET form: the search lives in the URL, so a result list can be reopened or shared.
 * `searched`: results are on screen, so Search steps back and the pre-screen buttons lead.
 */
export default function FinderForm({
  values,
  errors,
  searched = false,
}: {
  values: FinderInput;
  errors: string[];
  searched?: boolean;
}) {
  return (
    <form method="get" action="/find" className={`${cardClass} mt-8 p-5`} data-find-form>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className={labelClass}>Condition</span>
          <input
            name="condition"
            defaultValue={values.condition}
            placeholder="breast cancer"
            maxLength={120}
            required
            className={field}
            data-find-condition
          />
        </label>
        <label className="block">
          <span className={labelClass}>
            Stage or markers <span className="font-normal text-ink-secondary">(optional)</span>
          </span>
          <input
            name="markers"
            defaultValue={values.markers}
            placeholder="metastatic, BRCA2"
            maxLength={120}
            className={field}
            data-find-markers
          />
        </label>
        <label className="block">
          <span className={labelClass}>City</span>
          <input
            name="city"
            defaultValue={values.city}
            placeholder="Plovdiv"
            maxLength={60}
            required
            className={field}
            data-find-city
          />
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-small text-ink-secondary">Search terms only. Do not enter the patient&rsquo;s name or other personal details.</p>
        <button type="submit" className={`${buttonClass(searched ? "secondary" : "primary")} w-full sm:w-auto sm:min-w-[10rem]`} data-find-submit>
          Search
        </button>
      </div>
      {errors.length > 0 && <ErrorLine className="mt-3 text-body">{errors.join(" ")}</ErrorLine>}
    </form>
  );
}
