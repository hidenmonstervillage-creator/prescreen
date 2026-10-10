// Karma interface icons, inlined from public/icons so they need no request and take the text colour.
// State icons are not here: they live in StateCell, the only place a criterion state is rendered.

type IconProps = { className?: string };

/** Slashed circle, for errors. Never "!" or a cross: those are state glyphs. */
export function UnavailableIcon({ className = "size-5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <circle cx="10" cy="10" r="6.75" />
      <path d="M5.25 14.75l9.5-9.5" />
    </svg>
  );
}

/** Loading. Turns only when the viewer allows motion. */
export function Spinner({ className = "size-5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 motion-safe:animate-spin ${className}`}
    >
      <path d="M10 3.25a6.75 6.75 0 1 1-6.75 6.75" />
    </svg>
  );
}

/** One line of error text: slashed circle and a sentence in ink, never red (Karma). */
export function ErrorLine({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={`flex items-start gap-2 text-small font-medium text-ink ${className}`}>
      <UnavailableIcon className="mt-px size-5" />
      <span>{children}</span>
    </p>
  );
}
