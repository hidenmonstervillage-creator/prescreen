import { PACK_FOOTER_TEXT } from "@/lib/wording";

/** The lead pack footer: on every page of the PDF, and under every page of the preview. */
export default function PackFooter() {
  return (
    <footer data-pack-footer className="mt-5 border-t border-line pt-3 text-small font-medium text-ink-secondary">
      {PACK_FOOTER_TEXT}
    </footer>
  );
}
