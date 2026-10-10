"use client";

import { buttonClass } from "../ui";

/** Opens the browser's print dialog; "Save as PDF" is one of its destinations. No library, no network. */
export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("primary", "lg")} data-print-kit>
      Print / Save as PDF
    </button>
  );
}
