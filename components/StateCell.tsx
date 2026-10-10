// The only place a criterion state is rendered (CLAUDE.md rule 2): colour, icon and word.
import { STATE_LABEL } from "@/lib/states";
import type { State } from "@/lib/types";

const LOOK: Record<State, { icon: string; className: string }> = {
  met: { icon: "✓", className: "bg-green-50 text-green-800 ring-green-600/40" },
  not_met: { icon: "✕", className: "bg-red-50 text-red-800 ring-red-600/40" },
  not_found: { icon: "?", className: "bg-gray-100 text-gray-700 ring-gray-500/40" },
  needs_clinician: { icon: "!", className: "bg-amber-50 text-amber-900 ring-amber-600/40" },
};

export default function StateCell({ state }: { state: State }) {
  const look = LOOK[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-sm font-medium ring-1 ring-inset ${look.className}`}
    >
      <span aria-hidden="true" className="font-bold">
        {look.icon}
      </span>
      {STATE_LABEL[state]}
    </span>
  );
}
