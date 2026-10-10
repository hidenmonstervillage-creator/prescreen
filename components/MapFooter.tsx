import { FOOTER_TEXT } from "@/lib/wording";

export default function MapFooter() {
  return (
    <footer data-map-footer className="mt-8 border-t border-gray-200 pt-4 text-sm text-gray-600">
      {FOOTER_TEXT}
    </footer>
  );
}
