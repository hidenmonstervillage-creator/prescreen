// The design system's recipes (docs/design-system) as class strings, so every screen shares them.
// Colours are semantic tokens only; red, green and amber belong to the four criterion states.

export const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-action font-semibold text-action-ink hover:bg-action-hover disabled:bg-disabled-fill disabled:text-disabled-ink",
  secondary:
    "border border-control bg-surface font-semibold text-ink hover:border-control-hover hover:bg-page disabled:border-line disabled:bg-surface disabled:text-disabled-ink",
  ghost: "font-medium text-ink-secondary hover:bg-surface-sunken hover:text-ink disabled:bg-transparent disabled:text-disabled-ink",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-body",
  md: "h-10 px-4 text-body",
  lg: "h-14 px-7 text-[18px] leading-6",
};

/** One primary per view. Works on <button> and on <a>. `lg` is for the public pre-screen page, read on phones. */
export function buttonClass(variant: Variant = "secondary", size: Size = "md"): string {
  return `inline-flex shrink-0 items-center justify-center gap-2 rounded-lg disabled:cursor-not-allowed ${focusRing} ${SIZE[size]} ${VARIANT[variant]}`;
}

/** A header nav item (AppHeader recipe): the current page has a 2px ink underline on the header's bottom edge. */
export function navItemClass(current: boolean): string {
  return `inline-flex h-full items-center border-b-2 px-3 text-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-focus-ring ${
    current ? "border-ink font-semibold text-ink" : "border-transparent font-medium text-ink-secondary hover:border-line-strong hover:text-ink"
  }`;
}

export const labelClass = "block text-small font-semibold text-ink";

export const helpClass = "mt-1.5 text-small text-ink-secondary";

export const inputClass = `h-10 w-full rounded-lg border border-control bg-surface px-3 text-body text-ink placeholder:text-ink-muted hover:border-control-hover disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-sunken disabled:text-disabled-ink ${focusRing}`;

/** An input in its error state: a 2px ink border, never red (red belongs to a criterion state). */
export const inputErrorClass = "border-2 border-ink hover:border-ink";

/** Small uppercase section label, 14px (the floor). */
export const sectionLabel = "text-label uppercase text-ink-secondary";

/** Flat: a white card on the page ground with a hairline. */
export const cardClass = "rounded-2xl border border-line bg-surface shadow-card";

/** NCT IDs are the one monospace thing on screen. */
export const nctClass = "font-mono font-medium";

/** An NCT ID in a meta line (the trial-id type style). */
export const trialIdClass = "font-mono text-small font-medium";

export const linkClass = `rounded-sm text-link underline underline-offset-2 hover:text-link-hover ${focusRing}`;

/** A link that sits where its place makes it obvious ("Back to hospital inbox"): no underline until hover. */
export const quietLinkClass = `rounded-sm font-semibold text-link hover:text-link-hover hover:underline underline-offset-2 ${focusRing}`;

/**
 * A neutral pill: ink on surface-sunken. For labels that are not criterion states, such as a trial's
 * recruiting status and "referral-ready". Never green: green belongs to met.
 */
export const neutralPill =
  "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full bg-surface-sunken px-2.5 text-small font-medium text-ink";

/** Checkboxes and radios take the selected colour. */
export const checkClass = "size-5 shrink-0 accent-selected-line";
