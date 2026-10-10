# Ranked trial row

One recruiting trial in the ranked list: rank, ID, phase, status, countries, title, the four count pills and the way into its criterion matrix.

## Anatomy

- Rank: `text-heading font-semibold tabular-nums text-ink-secondary`, with a visually hidden "Rank".
- Meta line (`text-small text-ink-secondary`): NCT ID as a mono link · phase · recruiting status · country count.
- Title: `text-body font-semibold`, up to two lines, as registered.
- Count pills, then "Open the criterion matrix →" pushed right (`ml-auto`).

## States

| State | Classes |
| --- | --- |
| Default | `border-line bg-surface` |
| Hover | `border-line-strong bg-page` |
| Selected (its matrix is open) | `border-selected-line bg-selected-tint ring-1 ring-inset ring-selected-line` |
| Focus | the link inside takes the focus ring |

## Rules

- "Recruiting" is plain text. Never green: green belongs to met.
- The rank orders the list, and that is all it does: no percentage, star or bar appears next to it.
- Count pills always show all four, zeros included.
