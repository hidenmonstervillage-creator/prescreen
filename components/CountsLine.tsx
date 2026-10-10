import { countStates } from "@/lib/states";
import type { MappingRow, State } from "@/lib/types";
import { CountPills, CountsLineIcons } from "./StateCell";

/**
 * The four counts, from map rows or from counts already taken. `pills` where the counts are the main
 * thing (inbox rows, the map header); `line` where pills would be too heavy (the lead pack). Both are
 * drawn by StateCell, the only renderer of a state.
 */
export default function CountsLine({
  rows,
  counts,
  look = "line",
}: {
  rows?: Pick<MappingRow, "state">[];
  counts?: Record<State, number>;
  look?: "line" | "pills";
}) {
  const c = counts ?? countStates(rows ?? []);
  return look === "pills" ? <CountPills counts={c} /> : <CountsLineIcons counts={c} size="body" />;
}
