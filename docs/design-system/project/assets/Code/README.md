# Code

Generated from `tokens.json` by `karma-tailwind-build.mjs`; rebuild rather than edit.

- `karma-tailwind-v3-preset.js`: Tailwind v3 preset: every colour token, the type scale, the font stacks, the three shadows, `max-w-content` and `w-panel`. Extends the default theme.
- `karma-tailwind-v4-theme.css`: the same as a Tailwind v4 `@theme` block, plus the `@font-face` rules for `Geologica-Sharp-Variable.woff2` and `OverpassMono-Variable.woff2` (keep both font files beside it).
- `karma-tailwind-build.mjs`: the script that writes the two files above from `tokens.json`: `node karma-tailwind-build.mjs tokens.json [output-folder]`. Run it after a palette change.
