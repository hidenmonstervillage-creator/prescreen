// The only place a criterion state is rendered (CLAUDE.md rule 2): colour, icon and word.
// Sized for a projector: the state has to read from the back of the room.
// Icons are Karma's state icons (public/icons/state-*.svg), inlined so they print and need no
// request. Their shapes differ (circle, square, dashed ring, diamond), so states stay apart in
// greyscale and for colour-blind viewers. In forced-colors mode the icon gives way to its glyph.
import { STATE_LABEL } from "@/lib/states";
import type { State } from "@/lib/types";

// bg-green-50 is Karma's state-met-tint (aliased in tailwind.config.ts, see the note there).
const LOOK: Record<State, { pill: string; glyph: string }> = {
  met: { pill: "border-state-met-line bg-green-50 text-state-met-ink", glyph: "✓" },
  not_met: { pill: "border-state-not-met-line bg-state-not-met-tint text-state-not-met-ink", glyph: "✕" },
  not_found: {
    pill: "border-dashed border-state-not-found-line bg-state-not-found-tint text-state-not-found-ink",
    glyph: "?",
  },
  needs_clinician: { pill: "border-state-clinician-line bg-state-clinician-tint text-state-clinician-ink", glyph: "!" },
};

function StateIcon({ state }: { state: State }) {
  const svg = { viewBox: "0 0 16 16", "aria-hidden": true, className: "size-7 shrink-0 forced-colors:hidden" } as const;
  switch (state) {
    case "met":
      return (
        <svg {...svg}>
          <circle cx="8" cy="8" r="7.5" fill="#115E59" />
          <path d="M4.6 8.3l2.3 2.3 4.6-5" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "not_met":
      return (
        <svg {...svg}>
          <rect x="1.25" y="1.25" width="13.5" height="13.5" rx="2.5" fill="#D6341C" />
          <path d="M5.4 5.4l5.2 5.2M10.6 5.4l-5.2 5.2" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "not_found":
      return (
        <svg {...svg}>
          <circle
            cx="8"
            cy="8"
            r="6.6"
            fill="none"
            stroke="#64748B"
            strokeWidth="1.6"
            strokeDasharray="3.1 2.08"
            transform="rotate(-78 8 8)"
          />
          <path d="M5.3 8h5.4" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "needs_clinician":
      return (
        <svg {...svg}>
          <path d="M8 .9l7.1 7.1L8 15.1.9 8z" fill="#FBBF24" stroke="#92400E" strokeWidth="1" strokeLinejoin="round" />
          <path d="M8 4.6v4.1" fill="none" stroke="#451A03" strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="8" cy="11.15" r="1.05" fill="#451A03" />
        </svg>
      );
  }
}

export default function StateCell({ state }: { state: State }) {
  const look = LOOK[state];
  return (
    <span
      className={`inline-flex min-h-12 items-center gap-2.5 whitespace-nowrap rounded-full border-2 py-1.5 pl-2 pr-4 text-[22px] font-semibold leading-7 ${look.pill}`}
    >
      <StateIcon state={state} />
      <span aria-hidden="true" className="hidden w-7 text-center font-bold forced-colors:inline">
        {look.glyph}
      </span>
      <span>{STATE_LABEL[state]}</span>
    </span>
  );
}
