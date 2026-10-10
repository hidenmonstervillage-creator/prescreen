# Criterion matrix

Every inclusion and exclusion criterion of one trial, each with its state, the evidence quote and the document and page, filterable by state.

## Anatomy

- Filter chips (see **Filter chip**), "All" pressed by default.
- Sticky header: Section · Criterion · State · Evidence · Document · page.
- Rows: section label (`text-small text-ink-secondary`), criterion as registered, state pill, the quote in quotation marks (`lang="bg"`), source chips.
- A not found row spans Evidence and Document · page with one "not in the documents".

## Sticky header

`sticky top-16 z-10 bg-surface-sunken`, plus `shadow-raised` once it is stuck under the 64px app header. The rounded container must use `overflow-clip`, not `overflow-hidden`: `overflow-hidden` makes a scroll container and the header stops sticking.

## States

- Row hover: `hover:bg-page`. The whole row opens the evidence panel; give it a real button or link in the criterion cell for keyboard users.
- Selected row (its evidence panel is open): `bg-selected-tint`.

## Rules

- Rows keep the trial's order inside each section; filters hide rows, they never re-sort them.
- An empty filter shows the empty state ("No criteria are not found for this trial"), never a blank table.
- Quotes stay verbatim and complete; wrap them, don't truncate them.
