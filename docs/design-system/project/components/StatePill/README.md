# State pill

Shows one criterion's state as colour, icon and word together, which is the only way a state may appear.

## When to use

- The State column of the criterion matrix and the header of the evidence panel: anywhere one criterion's state is shown.
- For a number of criteria use **Count pill**; for a one-line summary use **Counts line**.

## The four states

Meanings are fixed. Design may change how a state looks, never what it means.

| State | Means | Icon (all 16px) | Tokens |
| --- | --- | --- | --- |
| met | the documents support it | filled circle with a check | `state-met-*` |
| not met | the documents contradict it | filled square with a cross | `state-not-met-*` |
| not found | the documents don't contain the information | dashed ring with a dash; the pill border is dashed too | `state-not-found-*` |
| needs a clinician | a judgment call Karma never makes | filled diamond with "!" (the flowchart shape for a decision) | `state-clinician-*` |

The shapes differ, so the states stay apart in greyscale, for red-green colour blindness and on a washed-out projector. The second row of the preview is the live greyscale check.

## Recipe

```html
<span class="inline-flex h-7 items-center gap-1.5 rounded-full border pl-1.5 pr-2.5 text-small font-medium border-state-met-line bg-state-met-tint text-state-met-ink">
  <!-- 16px state icon, aria-hidden (copy from the preview or assets/Icons/state-met.svg) -->
  met
</span>
```

Swap the three colour classes per state (`border-state-…-line bg-state-…-tint text-state-…-ink`). Not found also takes `border-dashed`.

## Rules

- Never colour without icon and word, never an icon alone, never a coloured dot or row tint standing in for a state.
- Use exactly these four lowercase words. No synonyms such as "passed", "failed", "unknown" or "review".
- The pill is a label, not a button. If clicking opens the evidence panel, the row is the button.
- No verdict words next to a pill, in its tooltip or in its alt text (see Do's and don'ts).
- Exclusion criteria: if they are shown as written, "met" on an exclusion means the documents support the exclusion, and its teal pill could read as reassurance. Settle how exclusions are worded before the build-day screens ship.

## You provide

`state`: `met` | `not-met` | `not-found` | `clinician`. The icon is `aria-hidden`; the word is the accessible name.
