# Count pill

A state pill with a number in front, so it reads as a short sentence: "6 met", "7 need a clinician".

## When to use

The four count pills sit together, always in the order met, not met, not found, needs a clinician: on a ranked trial row, a cohort summary, a site-mode row.

## Recipe

```html
<span class="inline-flex h-7 items-center gap-1.5 rounded-full border pl-1.5 pr-2.5 text-small font-medium border-state-met-line bg-state-met-tint text-state-met-ink">
  <!-- 16px state icon, aria-hidden -->
  <span class="font-semibold tabular-nums">6</span>met
</span>
```

A zero swaps the three colour classes for `border-line bg-surface text-ink-secondary` and keeps its icon and word, so non-zero counts stand out: "0 not met" is still said, quietly.

## Rules

- Count first, then the word. `tabular-nums` keeps columns of counts aligned.
- Grammar: 1 → "needs a clinician", any other number → "need a clinician". The other three words never change.
- Show all four pills even when a count is zero. A missing pill reads as missing data.
- Pills wrap to a second line before they shrink. Never truncate the word.

## You provide

`state` and `count` (an integer, 0 or more).
