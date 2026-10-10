import { FOOTER_TEXT } from "@/lib/wording";

/**
 * The footer on every screen (the design system's Footer recipe), rendered once by app/layout.tsx.
 * It first sat under the submission map, hence the name. Atlas keeps its own sentence.
 */
export default function MapFooter() {
  return (
    <footer data-map-footer className="border-t border-line bg-surface print:hidden">
      <p className="mx-auto max-w-content px-5 py-4 text-small text-ink-secondary">{FOOTER_TEXT}</p>
    </footer>
  );
}
