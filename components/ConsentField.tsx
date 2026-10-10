import { CONSENT_TEXT } from "@/lib/consent";

/** The required consent box above the submit button: one checkbox, English and Bulgarian side by side. */
export default function ConsentField({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className="rounded-xl border border-control bg-surface p-4 hover:border-control-hover has-[:checked]:border-selected-line has-[:checked]:bg-selected-tint has-[:checked]:ring-1 has-[:checked]:ring-inset has-[:checked]:ring-selected-line"
      data-consent
    >
      <label className="flex cursor-pointer items-start gap-3.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required
          className="mt-1 size-6 shrink-0 accent-selected-line"
          data-consent-input
        />
        <span className="grid gap-3 md:grid-cols-2 md:gap-6">
          <span lang="en" className="text-[17px] leading-7 text-ink">
            {CONSENT_TEXT.en}
          </span>
          <span lang="bg" className="text-[17px] leading-7 text-ink">
            {CONSENT_TEXT.bg}
          </span>
        </span>
      </label>
    </div>
  );
}
