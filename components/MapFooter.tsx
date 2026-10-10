import { FOOTER_TEXT } from "@/lib/wording";

export default function MapFooter() {
  return (
    <footer data-map-footer className="mt-8 border-t border-line pt-4 text-body font-medium text-ink-secondary">
      {FOOTER_TEXT}
    </footer>
  );
}
