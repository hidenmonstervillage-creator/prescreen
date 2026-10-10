// Karma recipes (buttons, fields, labels, cards) as class strings, so every screen shares them.
// Colours are Karma tokens only; red, green and amber belong to the four criterion states.

export const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-action font-semibold text-action-ink hover:bg-action-hover disabled:bg-disabled-fill disabled:text-disabled-ink",
  secondary:
    "border border-control bg-surface font-semibold text-ink hover:border-control-hover hover:bg-page disabled:border-line disabled:bg-surface disabled:text-disabled-ink",
  ghost: "font-medium text-ink-secondary hover:bg-surface-sunken hover:text-ink disabled:bg-transparent disabled:text-disabled-ink",
};

const SIZE: Record<Size, string> = {
  md: "h-10 px-4 text-body",
  lg: "h-14 px-7 text-[18px] leading-6",
};

/** One primary per view (Karma). Works on <button> and on <a>. */
export function buttonClass(variant: Variant = "secondary", size: Size = "md"): string {
  return `inline-flex shrink-0 items-center justify-center gap-2 rounded-lg disabled:cursor-not-allowed ${focusRing} ${SIZE[size]} ${VARIANT[variant]}`;
}

export const labelClass = "block text-small font-semibold text-ink";

export const helpClass = "mt-1.5 text-small text-ink-secondary";

export const inputClass = `h-10 w-full rounded-lg border border-control bg-surface px-3 text-body text-ink placeholder:text-ink-muted hover:border-control-hover disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-sunken disabled:text-disabled-ink ${focusRing}`;

/** Small uppercase section label, 14px (the Karma floor). */
export const sectionLabel = "text-label uppercase text-ink-secondary";

export const cardClass = "rounded-xl border border-line bg-surface shadow-card";

/** NCT IDs are the one monospace thing on screen. */
export const nctClass = "font-mono font-medium tracking-tight";

export const linkClass = `rounded-sm text-link underline underline-offset-2 hover:text-link-hover ${focusRing}`;
