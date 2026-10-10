# Button

Three variants: primary for the one action a view exists for, secondary for the rest, ghost for quiet actions inside dense rows.

## Recipes (40px; small is `h-8 px-3`)

| Variant | Classes |
| --- | --- |
| Primary | `inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-body font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed bg-action text-action-ink hover:bg-action-hover disabled:bg-disabled-fill disabled:text-disabled-ink` |
| Secondary | `inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-body font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed border border-control bg-surface text-ink hover:border-control-hover hover:bg-page disabled:border-line disabled:bg-surface disabled:text-disabled-ink` |
| Ghost | `inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed font-medium text-ink-secondary hover:bg-surface-sunken hover:text-ink disabled:bg-transparent disabled:text-disabled-ink` |

Icon buttons: `grid size-10 place-items-center rounded-lg` with an `aria-label`.

## States

Default, hover, focus (2px `focus-ring` outline, 2px offset, on every variant), disabled (`disabled` attribute; primary turns `disabled-fill`). Loading keeps the label and adds a spinner before it, with `aria-busy="true"`.

## Rules

- One primary per view ("Find trials"). Primary is `action`, the only dark fill on screen.
- Verb first, sentence case: "Find trials", "Add documents", "Try again". No exclamation marks.
- Never red, green or amber buttons: those colours mean criterion states.
