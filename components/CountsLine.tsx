import { countsLine, countsText } from "@/lib/states";
import type { MappingRow, State } from "@/lib/types";

/** The four counts, from map rows or from counts already taken. `compact` is the inbox row size. */
export default function CountsLine({
  rows,
  counts,
  compact = false,
}: {
  rows?: Pick<MappingRow, "state">[];
  counts?: Record<State, number>;
  compact?: boolean;
}) {
  return (
    <p data-counts className={`${compact ? "text-body font-medium" : "text-title"} tabular-nums text-ink`}>
      {counts ? countsText(counts) : countsLine(rows ?? [])}
    </p>
  );
}
