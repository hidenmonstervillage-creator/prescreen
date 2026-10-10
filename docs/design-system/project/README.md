Karma helps hospital research coordinators find recruiting clinical trials for one patient. It reads the patient's documents, builds a case card where every value cites its document and page, ranks recruiting trials from ClinicalTrials.gov, and shows each trial's criteria in one of four states with the evidence. It never decides whether a patient can join a trial: it shows its work and a clinician decides. The promise is the tagline: **Every criterion cited. Nothing inferred.**

Design Karma like a careful clinical document, not a product pitch: quiet, precise, near-black ink on white with one family of blues, the evidence as the loudest thing on screen and colour spent only on meaning. Every screen has to work twice: from the back of a room on a 1920×1080 projector, and for coordinators who screen patients all day.

The brand surfaces are the one exception: the landing page's main section and title slides sit on a soft dark ground with a light made of dots (Brand surfaces, below). The work screens never go dark.

## Content

- Write the interface in English, sentence case: "Find trials", "Open the criterion matrix →". Keep every value from a document verbatim, in its own language (often Bulgarian Cyrillic), with its units and punctuation, inside an element with `lang="bg"` (or the document's language).
- Use the four state words exactly, lowercase: **met**, **not met**, **not found**, **needs a clinician**. Counts go number first: "6 met · 0 not met · 9 not found · 7 need a clinician", and "1 needs a clinician" for one.
- Write a missing value as **not in the documents**. Never a blank, "N/A", a dash or "unknown".
- Use no verdict words anywhere; the list is in Do's and don'ts. The approved phrasings are "match profile" and "best-matching cohort".
- Point explanations at the documents, not at the patient: "The labs give total bilirubin 41 µmol/L against a range of 3–21." Never a judgment about the patient.
- Format dates as "14 Jan 2026", pages as "p. 1", documents as "02 Pathology report.pdf", quotes in “…”.
- No exclamation marks, no emoji, no claims about intelligence.
- Show **Fictional patient** next to every demo patient's name and **Frozen demo** whenever frozen data is on screen. Every screen ends with the footer: "Karma organizes and cites documents. It does not interpret, recommend or decide."

## Colour

Colour is reserved for meaning; everything else comes from the neutral palette.

### The main palette

Fifteen colours make up Karma's look: **seven brand colours** (a near-black, five blues and a light grey) and **eight support colours** derived from them, because a working screen also needs a page ground, hairlines and secondary text. They are the only colour values the interface uses, and Colors lists them first, as the **Palette** group. Every semantic token below is an alias of one of them, so changing a palette colour changes everything that uses it: the tokens, every preview and the cover.

| Palette colour | Value | Kind | Used by |
| --- | --- | --- | --- |
| `carbon` | `#131313` | brand | `ink`, `action` (through `ink`), `brand-ground`, `brand-action-ink` |
| `navy` | `#132774` | brand | `action-hover`, `link-hover`, `brand-glow` |
| `cobalt` | `#2443B8` | brand | `link`, `brand-dot-1` |
| `accent` | `#4965EB` | brand | `focus-ring`, `selected-line`, `evidence-line`, `brand-dot-2` |
| `periwinkle` | `#818FF2` | brand | `brand-dot-3` |
| `lavender` | `#B2B9F7` | brand | `evidence-mark`, `brand-dot-4` |
| `mist` | `#E7E7E7` | brand | `surface-sunken`, `brand-ink`, `brand-action`, `brand-dot-5` |
| `white` | `#FFFFFF` | support | `surface`, `action-ink` |
| `page` | `#F6F6F6` | support | the page ground itself (`bg-page`) |
| `fog` | `#DCDCDC` | support | `line`, `disabled-fill` |
| `cloud` | `#BDBDBD` | support | `line-strong` |
| `pewter` | `#6E6E6E` | support | `control`, `ink-muted`, `disabled-ink` |
| `graphite` | `#4A4A4A` | support | `control-hover`, `ink-secondary` |
| `ice` | `#EFF1FE` | support | `selected-tint` (`lavender` into white, 20%) |
| `highlight` | `#DBE0FC` | support | `evidence-tint` (`lavender` into white, 45%) |

To change the palette: open Colors, press Edit, pick a new value for a palette colour, watch the contrast marks on the text colours (`carbon`, `graphite`, `pewter`, `cobalt`, `navy`), and save. Then download `tokens.json` and run `assets/Code/karma-tailwind-build.mjs` so the app's Tailwind files follow.

- Keep each palette colour in its job: `carbon` the dark; the neutrals from light to dark (`white`, `page`, `mist`, `fog`, `cloud`, `pewter`, `graphite`, `carbon`) are pure greys, with no blue or warm tint; the blues from dark to light (`navy`, `cobalt`, `accent`, `periwinkle`, `lavender`), with `ice` and `highlight` as pale tints of `lavender`.
- Text in blue is always `cobalt` (links) or `navy` (link hover). `accent` is for rings, edges and marks: it is too light for small text on `page` and `mist`. `periwinkle` and `lavender` are never text.
- Keep every blue out of the green, red, amber and violet families: those already mean the four states and the Fictional patient badge.

### Semantic tokens: use these in components

| Meaning | Tokens |
| --- | --- |
| Ground and structure | `page`, `surface`, `surface-sunken`, `line`, `line-strong`, `control`, `control-hover` |
| Text | `ink`, `ink-secondary`, `ink-muted` (optional metadata only, never on `surface-sunken`, never on a projector screen) |
| The one action per view | `action`, `action-hover`, `action-ink`; disabled: `disabled-fill`, `disabled-ink` |
| The accent: go there, you are here, the cited text | `link`, `link-hover`, `focus-ring`, `selected-tint`, `selected-line`, `evidence-tint`, `evidence-mark`, `evidence-line` |

- Set text in `ink` on `page`, `surface` or any tint, secondary text in `ink-secondary`.
- In components, use the semantic classes (`text-ink`, `bg-surface`), not the palette ones (`text-carbon`, `bg-white`): the semantic name is what keeps a component right when the palette changes.
- Use the blues only for what they mean: links and IDs, focus, the selected thing, highlighted evidence, and the logo. Keep them out of fills behind text and out of large areas in the work screens; the primary button stays `action` (ink), and only its hover turns `navy`.
- Never use red for an error, green for "recruiting" or "done", amber for a warning, or blue for decoration inside the app. Form errors are `ink` with a 2px ink border.
- The work screens are light mode only. Dark appears only on brand surfaces, with the `brand-*` tokens below.

### Brand surfaces: the landing page and title slides

The landing page's main section and the title slides are where the identity can be loud: a soft dark ground and a light made of dots. They use only these tokens.

| Token | Alias of | Use |
| --- | --- | --- |
| `brand-ground` | `carbon` | the dark ground |
| `brand-glow` | `navy` | a soft radial glow behind the light, at about 70% opacity |
| `brand-ink` | `mist` | all text on the ground, 15.0:1 |
| `brand-action`, `brand-action-ink` | `mist`, `carbon` | the one button ("Try the demo"), 15.0:1 |
| `brand-dot-1` … `brand-dot-5` | `cobalt`, `accent`, `periwinkle`, `lavender`, `mist` | the light made of dots, from the outer edge to the core |

The light made of dots is five dot grids with the same spacing (10px), stacked exactly on top of each other. Each layer has a bigger, paler dot than the one under it (radius 1.1, 1.7, 2.4, 3.0 and 3.5px) and a smaller visible area, set with a radial `mask-image`. In the core all five show, so the biggest, palest dot wins; toward the edge the top layers fade, so the dot you see gets smaller and bluer. It costs one paint and needs no script. Keep it `aria-hidden`, keep text on the plain ground beside it, and stop any movement in it under `prefers-reduced-motion`.

### Reserved families

| Meaning | Tokens |
| --- | --- |
| Fictional patient, and nothing else | `fictional-ink`, `fictional-tint`, `fictional-line` |
| Frozen demo | `frozen-ink`, `frozen-tint`, `frozen-line` |
| The four criterion states, and nothing else | `state-met-*`, `state-not-met-*`, `state-not-found-*`, `state-clinician-*` |

These keep their own values and are not part of the palette. The state colours were tuned together for greyscale, red-green colour blindness and the projector; change one only with the Accessibility checks beside you.

## The four states

| State | Means | Icon | Pill |
| --- | --- | --- | --- |
| met | the documents support it | filled circle with a check: `state-met-solid`, `state-met-glyph` | `state-met-tint` fill, `state-met-line` border, `state-met-ink` word |
| not met | the documents contradict it | filled square with a cross: `state-not-met-solid`, `state-not-met-glyph` | `state-not-met-tint`, `state-not-met-line`, `state-not-met-ink` |
| not found | the documents don't contain the information | dashed ring with a dash: `state-not-found-solid` | white `state-not-found-tint`, **dashed** `state-not-found-line`, `state-not-found-ink` |
| needs a clinician | a judgment call Karma never makes | amber diamond with a dark "!": `state-clinician-solid`, `state-clinician-glyph`, `state-clinician-edge` | `state-clinician-tint`, `state-clinician-line`, `state-clinician-ink` |

Show a state as colour, icon and word together, every time. The four shapes differ (circle, square, ring, diamond), their lightness differs (dark teal, mid red, hollow grey, light amber) and met sits on the blue side of green, so the states stay apart in greyscale, for red-green colour blindness and on a washed-out projector. Every state word is at least 8.7:1 on its tint.

## Type

- Set everything in **Geologica, sharp**, self-hosted as one variable file, `fonts/Geologica-Sharp-Variable.woff2` (weights 100–900, Latin and Cyrillic). The sharpness axis is fixed at 100 inside the file, so every weight is the sharp cut with no extra CSS. Bulgarian letterforms switch on with `lang="bg"`, which verbatim values carry anyway.
- Set NCT IDs and compact source chip numbers ("02 · p. 1") in **Overpass Mono**, `fonts/OverpassMono-Variable.woff2` (weights 300–700, Latin and Cyrillic). Nothing else is monospace.
- Both fonts are under the SIL Open Font License 1.1. Geologica has no ✓, ✗ or superscript digits: a verbatim "10⁹/L" keeps its ⁹, drawn by the system font.
- `hero` 96/102 bold, tracked −0.035em: the landing page's main headline, on brand surfaces only (scale it with `clamp(44px, 6.6vw, 96px)`). `display` 40/48 bold: big in-app headlines and title slides. `title` 28/36 bold: page titles. `heading` 20/28 semibold: card and panel titles. `body` 15/22: everything else. `quote` 16/26: verbatim evidence only. `small` 14/20: pills, chips, metadata. `label` 14/20 semibold, tracked 0.06em, set uppercase: section labels and badges. `trial-id` 14/20 medium in Overpass Mono: NCT IDs and compact chip numbers.
- **14px is the floor.** Nothing on screen or on the projector is smaller; today's 12px pills, badges and section labels move to 14px.
- Use `tabular-nums` for counts, pages and dates so columns line up.

## Space and layout

- Use Tailwind's 4px spacing scale unchanged: `space-4` is `p-4` is 16px.
- Keep the 1400px content column (`size-content-max`) with 20px gutters (`size-gutter`) and the 64px header (`size-header`). The evidence panel is 520px (`size-panel`) from the right edge.
- Table rows `py-3`, card padding `p-5`, sections `gap-6`: dense, never cramped.
- On a projector, present at 125% browser zoom. The page is then 1536 CSS px wide, so the 1400px column keeps its gutters, and 14px text becomes 17.5px on screen. The same zoom lifts the frozen demo's 12px labels to 15px without touching code.

## Shape and elevation

- Radii: `radius-md` 6px for badges and source chips, `radius-lg` 8px for buttons, inputs and tabs, `radius-xl` 12px for the drop zone and page image, `radius-2xl` 16px for cards, `radius-full` for pills and filter chips.
- Keep it flat: white cards on `page` with a `line` border. Use `shadow-card` at most at rest, `shadow-raised` for things that float (the stuck matrix header), `shadow-panel` for the evidence panel.
- Focus is a solid 2px `focus-ring` outline, 2px off the element, on everything focusable. Never remove it.

## Sources

- Every extracted value keeps its source chip. Sources may be compact or grouped, never hidden.
- Use the full chip ("02 Pathology report.pdf · p. 1") where the name helps, the compact chip ("02 · p. 1") on the case card and from three sources, and the source group ("8 sources in 5 documents") from five sources or in tight cells. The group opens in place with one click.
- Document numbers come from the documents table and never change.

## Iconography

- State icons are the four shapes above at 16px, as inline SVG (`assets/Icons/state-*.svg`).
- Interface icons sit on a 20px grid with a 1.6px round stroke, inline with `stroke="currentColor"`: document, documents, chevrons, close, upload, unavailable, spinner.
- A cross means not met and "!" means needs a clinician; use neither anywhere else. Errors use the slashed circle (`unavailable`); closing uses a thin, unfilled ×.
- No emoji, no illustrations, no icon fonts, no CDN.

## Brand

- The logo is **Twin**: a disc with two spiral grooves. Use the files in `assets/Logos` and never redraw, retype or recolour it; **Wordmark** has the rules and the previews.
- It has two drawings of one mark: the dotted one from 64px tall and up, the solid one below that. Light grounds take `karma-lockup.svg` (the 64px app header takes `karma-lockup-solid.svg`, 28px tall); dark brand surfaces take the `-reversed` files; the tab and app icon is `karma-icon.svg`.
- Clear space is the height of the "k" on every side. In running text write Karma with a capital K, in the surrounding type.
- The three earlier directions (A, B, C) are retired. They stay in `assets/Retired` so old slides can be matched; don't use them in new work.
- Tagline: "Every criterion cited. Nothing inferred."

## Building with it

- Every token is one Tailwind class: `bg-page`, `text-state-met-ink`, `text-body`, `shadow-card`, `rounded-2xl`. The Tailwind section has the mapping; `assets/Code` has the v3 preset, the v4 theme and the script that rebuilds both from `tokens.json`.
- Each component's guidelines carry its class recipe, and its preview is the same markup.


---

## Consuming this system (generated: do not edit)

Every path named below is under `project/` in this design system: read `project/api/tokens.md`, not `api/tokens.md`.

26 components are documented without a runnable `components/bundle.js`: read each component’s card, and its README where it has one (`components/<Comp>/README.md`), and build to those guidelines. Tokens: the values are on `api/tokens.md`; a Slides deck or Design canvas also takes `tokens.json` by file path.

Fonts: `tokens.css` loads each font from its file, by path.

- **Design canvas:** copy `tokens.css` and `fonts/Inter-Variable.woff2` to the same paths under the canvas’s `project/ds/<folder>/` (`<folder>` is the folder you install this system under; `fonts/Inter-Variable.woff2` lands on `project/ds/<folder>/fonts/Inter-Variable.woff2`), in the same call that installs this system. Link that copy of `tokens.css` in the artboard’s `<head>` as `ds/<folder>/tokens.css`, or as Design’s instructions say for an artboard in a folder. If the install’s reply leaves a font out, bring that font in as for any other page.
- **Slides deck:** for each family you use in the deck (`faces` holds at most the number of typefaces Slides’ `deck-files.md` gives), install its file with the system and name the path it lands on as that family’s `src` in `project/deck.json` `faces`, under the key in the Slides column. A deck takes a font as a file only under the rule in Slides’ `fonts.md` (no space or leading underscore in its path, for two): any other font, or one kept by id, is uploaded as `fonts.md` says.
- **Any other page:** one file per family is enough (below: the upright face nearest regular weight; bold and italic synthesize). Fetch it as the fetch column says (Artifact tool `read`, that id or path as `path`), upload it as an asset (`publish`, `file_path`, `asset:true`) and declare it with an `@font-face { font-family: "<family>"; src: url(<uploaded>) }` rule.

| family | file | fetch | CSS | Slides `faces` key |
| --- | --- | --- | --- | --- |
| Inter | `fonts/Inter-Variable.woff2` (weight 100 900) | `read` the file with `project/` in front | `var(--font-sans)` | `inter` |

**Read, per thing:** a component’s props, parts and examples: `api/components/<Comp>.md`; token values: `api/tokens.md`; stored assets and their paths: `api/assets/<Group>.md`. After this README, fetch the cards and fonts you need in ONE message as parallel calls: none depends on another.

**Two rules.** Before you use a thing: a component, a token group, an icon, an asset: read its card from the index below; a value you did not read from a card is a guess. `tokens.json`, `manifest.json` and `design-system.json` are sources for tools: hand them over. `components/<Comp>/README.md` and `assets/<Group>/README.md` are the long-form second read a card links to; `SKILL.md` and `artifact-type/` beside them are authoring guidance, not needed to consume the system.

## Index (generated: do not edit)

**Tokens**

- `api/tokens.md`: Every token: surface, text, palette, type, spacing, radius, shadow, size. (20.2k)

**Icons and assets**

- `api/assets/Logos.md`: 7 files, by asset id. (2.2k)
- `api/assets/Icons.md`: 12 files, by asset id. (2.8k)

**Components** (`api/components/<Comp>.md`, 26)

- **App frame**: `AppHeader`: The 64px white bar on every screen: wordmark, tagline, the Frozen demo badge when the frozen demo runs, and the main navigation · `Footer`: The disclaimer line at the foot of every screen: "Karma organizes and cites documents
- **Actions**: `Button`: Three variants: primary for the one action a view exists for, secondary for the rest, ghost for quiet actions inside dense rows · `TextLink`: Links in the bright blue accent (link, an alias of accent): underlined inside sentences, plain where their place makes them obvious (NCT IDs, "Open the criteri…
- **Evidence**: `CaseCardSection`: A titled group of field rows on the case card, with compact forms for sections the documents say little or nothing about · `DocumentsTable`: The list of the case's documents, numbered in the order they were added; the numbers are the ones every compact source chip uses · `EvidencePanel`: The right-side panel that shows why a criterion has its state: the reasoning in one line, the trial's own wording, every source as a tab, the verbatim quote an… · `FieldRow`: One line of the case card: a label, the value exactly as the documents give it, and its sources; or "not in the documents" · `SourceChip`: A small button that names the exact document and page a value came from, and opens it · `SourceGroup`: One chip that stands for many sources ("8 sources in 5 documents") and opens in place, so a value with eight citations stays one line tall · `TimelineItem`: One dated event from the documents, in their words, with the sources it came from
- **Trials**: `CohortSummary`: For a trial with several cohorts: the best-matching cohort with its counts, and every other cohort collapsed to one row with its own counts · `CriterionMatrix`: Every inclusion and exclusion criterion of one trial, each with its state, the evidence quote and the document and page, filterable by state · `FilterChip`: A toggle above the criterion matrix that shows only the rows in one state, with the count beside each state · `SiteModeRow`: One patient against one trial in site mode: name, Fictional patient badge, the four count pills and the first not met criterion with its quote and source · `TrialRow`: One recruiting trial in the ranked list: rank, ID, phase, status, countries, title, the four count pills and the way into its criterion matrix
- **States**: `CountPill`: A state pill with a number in front, so it reads as a short sentence: "6 met", "7 need a clinician" · `CountsLine`: The four counts as one line of text with icons, "6 met · 0 not met · 9 not found · 7 need a clinician", for places where pills would be too heavy · `StateLegend`: Says what the four states mean, in the product's own words, wherever states first appear on a screen · `StatePill`: Shows one criterion's state as colour, icon and word together, which is the only way a state may appear
- **Status**: `DemoBadge`: Two badges that must never be missed: Fictional patient on every demo patient, Frozen demo whenever the app runs the frozen demo data
- **Landing**: `DemoCaseCard`: The landing page card that introduces the fictional demo patient and starts the demo with "Find trials"
- **Inputs**: `FileDropZone`: Where a coordinator adds one patient's documents; it numbers them in the order they will be cited · `Input`: A text field with its label above and its help or error below; errors are ink, not red
- **Feedback**: `ListStates`: How every list in Karma looks when it has nothing to show, is still working, or could not get its data
- **Brand**: `Wordmark`: Three ways to write Karma; each works in the 64px header, on a title slide and in one colour, and each has a favicon mark
