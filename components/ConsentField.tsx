import { CONSENT_TEXT } from "@/lib/consent";

/** The required consent box above the submit button: one checkbox, English and Bulgarian side by side. */
export default function ConsentField({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="rounded-xl border-2 border-line bg-surface px-4 py-4 has-[:checked]:border-selected-line has-[:checked]:bg-selected-tint" data-consent>
      <label className="flex cursor-pointer items-start gap-3.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required
          className="mt-1 size-6 shrink-0 accent-accent"
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
