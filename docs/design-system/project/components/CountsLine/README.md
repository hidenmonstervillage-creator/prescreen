# Counts line

The four counts as one line of text with icons, "6 met · 0 not met · 9 not found · 7 need a clinician", for places where pills would be too heavy.

## When to use

Cohort rows, summaries, headers, exports. Use **Count pill** where the counts are the main thing on the row.

## Recipe

Each segment is `inline-flex items-center gap-1.5` with the state's text colour (`text-state-met-ink` …), a 16px state icon, the count in `font-semibold tabular-nums`, then the word. Separators are `·` in `text-ink-secondary` with `aria-hidden="true"`. The line itself is `flex flex-wrap items-center gap-x-2 gap-y-1 text-small`.

## Rules

- Same order everywhere: met, not met, not found, needs a clinician.
- Same grammar as the Count pill ("1 needs a clinician", "7 need a clinician").
- Every segment keeps its icon. A counts line without icons is colour + word, which breaks rule 2.
