import type { MappingRow } from "@/lib/types";
import { summaryText } from "@/lib/summary";
import { cardClass, sectionLabel } from "./ui";

/**
 * The summary sentence, from the counts (lib/summary.ts). `card` under a criteria map; `line` in the
 * lead pack preview, where it sits under the counts as on the PDF. Ink only: it is not a state.
 */
export default function SummaryCard({ rows, look = "card" }: { rows: Pick<MappingRow, "criterion_id" | "state">[]; look?: "card" | "line" }) {
  const text = summaryText(rows);
  if (!text) return null;
  if (look === "line") {
    return (
      <p className="mt-2 text-body text-ink tabular-nums" data-summary>
        {text}
      </p>
    );
  }
  return (
    <section className={`${cardClass} mt-5 px-5 py-4`} data-summary>
      <p className={sectionLabel}>Summary</p>
      <p className="mt-1 text-body text-ink tabular-nums">{text}</p>
    </section>
  );
}
