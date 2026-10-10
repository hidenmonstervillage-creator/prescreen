import { countsLine } from "@/lib/states";
import type { MappingRow } from "@/lib/types";

export default function CountsLine({ rows }: { rows: Pick<MappingRow, "state">[] }) {
  return (
    <p data-counts className="text-title tabular-nums text-ink">
      {countsLine(rows)}
    </p>
  );
}
