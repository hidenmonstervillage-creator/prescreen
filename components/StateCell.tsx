// The only place a criterion state is rendered (CLAUDE.md rule 2): colour, icon and word, every time.
// One state is a StatePill (the default export); counts of states are CountPills or a counts line.
// The icons are the four shapes of the design system, 16px and drawn from the state tokens: a filled
// circle with a check, a filled square with a cross, a dashed ring with a dash, an amber diamond with
// "!". Shape and lightness differ, so the states stay apart in greyscale, for red-green colour
// blindness and on a washed-out projector. In forced-colors mode the icon gives way to its glyph.
import { STATE_LABEL, countsText } from "@/lib/states";
import { STATES, type State } from "@/lib/types";

const LOOK: Record<State, { colours: string; ink: string; dashed: boolean; glyph: string }> = {
  met: { colours: "border-state-met-line bg-state-met-tint text-state-met-ink", ink: "text-state-met-ink", dashed: false, glyph: "✓" },
  not_met: {
    colours: "border-state-not-met-line bg-state-not-met-tint text-state-not-met-ink",
    ink: "text-state-not-met-ink",
    dashed: false,
    glyph: "✕",
  },
  not_found: {
    colours: "border-state-not-found-line bg-state-not-found-tint text-state-not-found-ink",
    ink: "text-state-not-found-ink",
    dashed: true,
    glyph: "?",
  },
  needs_clinician: {
    colours: "border-state-clinician-line bg-state-clinician-tint text-state-clinician-ink",
    ink: "text-state-clinician-ink",
    dashed: false,
    glyph: "!",
  },
};

/** The pill shape shared by StatePill and CountPill. */
const PILL = "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border pl-1.5 pr-2.5 text-small font-medium";

function StateIcon({ state }: { state: State }) {
  const svg = { viewBox: "0 0 16 16", "aria-hidden": true, className: "size-4 shrink-0 forced-colors:hidden" } as const;
  switch (state) {
    case "met":
      return (
        <svg {...svg}>
          <circle cx="8" cy="8" r="7.5" className="fill-state-met-solid" />
          <path d="M4.6 8.3l2.3 2.3 4.6-5" fill="none" className="stroke-state-met-glyph" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "not_met":
      return (
        <svg {...svg}>
          <rect x="1.25" y="1.25" width="13.5" height="13.5" rx="2.5" className="fill-state-not-met-solid" />
          <path d="M5.4 5.4l5.2 5.2M10.6 5.4l-5.2 5.2" fill="none" className="stroke-state-not-met-glyph" strokeWidth="2" strokeLinecap="round" />
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
            className="stroke-state-not-found-solid"
            strokeWidth="1.6"
            strokeDasharray="3.1 2.08"
            transform="rotate(-78 8 8)"
          />
          <path d="M5.3 8h5.4" fill="none" className="stroke-state-not-found-solid" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "needs_clinician":
      return (
        <svg {...svg}>
          <path d="M8 .9l7.1 7.1L8 15.1.9 8z" className="fill-state-clinician-solid stroke-state-clinician-edge" strokeWidth="1" strokeLinejoin="round" />
          <path d="M8 4.6v4.1" fill="none" className="stroke-state-clinician-glyph" strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="8" cy="11.15" r="1.05" className="fill-state-clinician-glyph" />
        </svg>
      );
  }
}

/** The glyph that stands in for the icon when the system forces its own colours. */
function ForcedGlyph({ state }: { state: State }) {
  return (
    <span aria-hidden="true" className="hidden w-4 text-center font-bold forced-colors:inline">
      {LOOK[state].glyph}
    </span>
  );
}

/** One criterion's state (StatePill recipe). The icon is hidden from assistive tech; the word is the name. */
export default function StateCell({ state }: { state: State }) {
  const look = LOOK[state];
  return (
    <span className={`${PILL} ${look.colours} ${look.dashed ? "border-dashed" : ""}`}>
      <StateIcon state={state} />
      <ForcedGlyph state={state} />
      <span>{STATE_LABEL[state]}</span>
    </span>
  );
}

/** The state word after a count: "1 needs a clinician", "7 need a clinician"; the other three never change. */
function countWord(state: State, count: number): string {
  return state === "needs_clinician" && count !== 1 ? "need a clinician" : STATE_LABEL[state];
}

/** A state pill with its count in front (CountPill recipe). A zero is said quietly, with its icon and word. */
export function CountPill({ state, count }: { state: State; count: number }) {
  const look = LOOK[state];
  const colours = count === 0 ? "border-line bg-surface text-ink-secondary" : look.colours;
  return (
    <span className={`${PILL} ${colours} ${look.dashed ? "border-dashed" : ""}`} data-count-state={state}>
      <StateIcon state={state} />
      <ForcedGlyph state={state} />
      <span className="font-semibold tabular-nums">{count}</span>
      {countWord(state, count)}
    </span>
  );
}

/**
 * All four count pills, in the fixed order, zeros included. Assistive tech reads the counts as one
 * sentence ("12 met · 0 not met · 7 not found · 15 need a clinician"); the pills are its picture.
 */
export function CountPills({ counts }: { counts: Record<State, number> }) {
  return (
    <div data-counts className="flex flex-wrap items-center gap-2">
      <p className="sr-only">{countsText(counts)}</p>
      <div aria-hidden="true" className="contents">
        {STATES.map((s) => (
          <CountPill key={s} state={s} count={counts[s]} />
        ))}
      </div>
    </div>
  );
}

/**
 * The four counts as one line of text with icons (CountsLine recipe), for summaries and the lead pack.
 * Each segment keeps its icon and its state's ink; the separators are hidden from assistive tech.
 */
export function CountsLineIcons({ counts, size = "small" }: { counts: Record<State, number>; size?: "small" | "body" }) {
  return (
    <div data-counts className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${size === "body" ? "text-body" : "text-small"}`}>
      <p className="sr-only">{countsText(counts)}</p>
      {STATES.map((s, i) => (
        <span key={s} aria-hidden="true" className="inline-flex items-center gap-2">
          {i > 0 && <span className="text-ink-secondary">·</span>}
          <span className={`inline-flex items-center gap-1.5 font-medium ${LOOK[s].ink}`}>
            <StateIcon state={s} />
            <ForcedGlyph state={s} />
            <span className="font-semibold tabular-nums">{counts[s]}</span>
            {countWord(s, counts[s])}
          </span>
        </span>
      ))}
    </div>
  );
}
