# Do's and don'ts

The rules Karma never bends. The first nine restate the brief; the last group is what this system adds to keep them.

## 1. Exactly four criterion states, with fixed meanings

| State | Means |
| --- | --- |
| met | the documents support it |
| not met | the documents contradict it |
| not found | the documents don't contain the information |
| needs a clinician | a judgment call the product never makes |

- **Do** change how a state looks when the system changes.
- **Don't** add a fifth state, merge two, rename one, or let a design change what a state means.

## 2. Colour + icon + word, every time

- **Do** show a state with its colour, its icon and its word together. The icons differ in shape: circle, square, dashed ring, diamond.
- **Don't** use colour-only dots, tinted rows, icon-only columns, or icons that differ only in colour.

## 3. No verdict words

- **Never write**, in labels, tooltips, alt text, examples, file names or exports: any word on the verdict list (in Atlas, `lib/wording.ts`), *fits*, or *match* as a verdict.
- **Also avoid** words that say the same thing: *passes*, *fails*, *suitable*, *candidate*, *approved*, *excluded* (as a verdict on the patient), *recommended*.
- **Do say** "match profile", "best-matching cohort", "the documents support it", "the documents contradict it".

## 4. Every extracted value keeps its source chip

- **Do** make sources compact ("02 · p. 1") or grouped ("8 sources in 5 documents").
- **Don't** hide sources behind hover only, behind a toggle that starts off, or cut off the page number.

## 5. Missing values read "not in the documents"

- **Don't** leave a blank, or write "N/A", a dash, "unknown", "none" or "0" for something the documents don't say.
- **Do** collapse a section of missing fields into one row that still says "not in the documents" and names the fields.

## 6. English interface, verbatim values

- **Do** write the interface in English and keep document values exactly as written, in their language, with `lang` set. Every type style renders Cyrillic.
- **Don't** translate, transliterate, round, convert units or tidy up a document's wording.

## 7. The demo badges stay prominent

- **Do** put **Fictional patient** next to every demo patient's name and **Frozen demo** in the header and on the demo card.
- **Don't** shrink, abbreviate, hide or let anyone dismiss them, and don't use violet for anything else.

## 8. No network for assets

- **Do** self-host the fonts (`fonts/Geologica-Sharp-Variable.woff2`, `fonts/OverpassMono-Variable.woff2`) and inline the SVG icons and wordmark.
- **Don't** load fonts, icons or images from a CDN or Google Fonts. The offline copy has no Wi-Fi.

## 9. The work screens stay light

- **Don't** ship a dark theme for the work screens yet. Every contrast figure for them is for light mode.
- **Do** keep dark to the brand surfaces (the landing page's main section, title slides), built only from the `brand-*` tokens, with text on the plain ground and never on the dot light.

## What this system adds

- **14px is the floor** for all text, projector included.
- **Red never means error, green never means "recruiting" or "done", amber never means warning.** Those colours belong to the states.
- **"!" and the cross are state glyphs.** Errors use the slashed circle; closing uses a thin unfilled ×.
- **One primary button per view.**
- **The focus ring is always visible.**
- **A rank only orders the list.** No percentages, stars or bars next to a rank.
- **Present at 125% browser zoom** on the projector.
