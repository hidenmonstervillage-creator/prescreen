# Vendored design system

`project/` is the Karma design system, unzipped from `karma-design-system.zip` on 2026-10-10. Atlas uses its palette, type, spacing, radii, shadows and component recipes so the two products read as one family. Atlas does not use the Karma name, logo files or footer sentence; it keeps its own wordmark and footer.

## Changes from the zip

Made so the folder passes `tests/ui.wording.test.ts` (CLAUDE.md rules 3 and 5). Nothing else was edited.

- Every em dash became a colon (between words) or the word "dash" (where the glyph itself was quoted).
- `1-dos-and-donts.md`: the spelled-out verdict list now points at the list in `lib/wording.ts`, and the rule about ranks now reads "A rank only orders the list".
- `components/TrialRow/README.md`: the rank rule now reads "The rank orders the list, and that is all it does".
- Added `fonts/Geologica-OFL.txt` and `fonts/OverpassMono-OFL.txt` (copies of the licences in `public/fonts`), so the fonts travel with their licence.

## Which file is current

`README.md` and `assets/Code/karma-tailwind-v3-preset.js` carry the current palette (`carbon`, `navy`, `cobalt`, `accent` ...) and Geologica with Overpass Mono. `tokens.css` and `api/tokens.md` still hold an older slate palette with Inter; Atlas does not read them. The zip has no `assets/Icons` or `assets/Logos` folders, so the Atlas state icons are drawn from the shapes the README describes.

## How Atlas consumes it

`tailwind.config.ts` adds `project/assets/Code/karma-tailwind-v3-preset.js` as a preset. The fonts are served from `public/fonts` (byte-identical to `project/fonts`) with `@font-face` rules in `app/globals.css`.
