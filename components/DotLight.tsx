/**
 * The light made of dots, for the landing hero only: a soft navy glow and five stacked dot grids
 * (styles in app/globals.css). Decorative, so hidden from assistive tech, and text never sits on it.
 */
export default function DotLight({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`dot-light ${className}`} data-dot-light>
      <span className="dot-light-glow" />
      <span className="dot-light-1" />
      <span className="dot-light-2" />
      <span className="dot-light-3" />
      <span className="dot-light-4" />
      <span className="dot-light-5" />
    </div>
  );
}
