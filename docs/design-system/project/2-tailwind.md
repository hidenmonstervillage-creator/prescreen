# Tailwind mapping

Every token is exactly one Tailwind class name, in Tailwind v3 and v4 alike. The token `state-met-ink` is the class `text-state-met-ink`, `page` is `bg-page`, the type style `body` is `text-body`, the shadow `shadow-card` is `shadow-card`.

## How each family maps

| Token family | Tailwind theme key | Example classes | Config needed? |
| --- | --- | --- | --- |
| Colour (`page`, `ink`, `state-met-solid` …) | `colors` | `bg-page`, `text-ink`, `border-line`, `fill-state-met-solid`, `outline-focus-ring` | yes, from the preset |
| Type styles (`display` … `label`) | `fontSize` (with line height, tracking, weight) | `text-title`, `text-body`, `text-label uppercase` | yes |
| Families (`sans`, `mono`) | `fontFamily` | `font-sans`, `font-mono` | yes (Geologica and Overpass Mono first) |
| Spacing (`space-1` … `space-16`) | the default spacing scale | `p-4`, `gap-1.5`, `px-5` | no, unchanged |
| Radius (`radius-md` … `radius-full`) | the default radii | `rounded-md`, `rounded-2xl`, `rounded-full` | no, unchanged |
| Shadow (`shadow-card`, `shadow-raised`, `shadow-panel`) | `boxShadow` | `shadow-card`, `shadow-raised`, `shadow-panel` | yes |
| Size (`size-content-max`, `size-panel` …) | `maxWidth`, `width`, default sizes | `max-w-content`, `w-panel`, `h-16`, `size-4` | two keys |

## Set-up

**Tailwind v3**: copy `assets/Code/karma-tailwind-v3-preset.js` into the app and add it as a preset:

```js
// tailwind.config.js
module.exports = {
  presets: [require('./karma-tailwind-v3-preset.js')],
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
};
```

**Tailwind v4**: copy `assets/Code/karma-tailwind-v4-theme.css`, `fonts/Geologica-Sharp-Variable.woff2` and `fonts/OverpassMono-Variable.woff2` side by side, then:

```css
@import "tailwindcss";
@import "./karma-tailwind-v4-theme.css";
```

Both files are generated from this system's tokens. Don't edit them by hand: change the token here, then rebuild them.

## The two tiers, in Tailwind

The main palette (`carbon`, `accent`, `mist` …) and the semantic tokens (`ink`, `link`, `surface-sunken` …) both become classes, so the mapping stays one token, one class. Components use the semantic classes; the landing page and title slides use the `brand-*` classes (`bg-brand-ground`, `text-brand-ink`, `text-hero`); the palette classes exist for the rare case with no semantic token.

- **v4** keeps the tiers: palette colours are written as values and every semantic colour as `var()` of one, for example `--color-ink: var(--color-carbon)`.
- **v3** needs plain colours, so the preset follows each alias to its final value.

## After a palette change

1. Change the palette in Colors and save.
2. Download `tokens.json` from this system.
3. Run the script that ships beside the presets:

```sh
node karma-tailwind-build.mjs tokens.json
```

It rewrites `karma-tailwind-v3-preset.js` and `karma-tailwind-v4-theme.css` in the current folder. Class names don't change, so no component needs editing.

The preset **extends** Tailwind's default theme, so the frozen demo screens keep working with `bg-slate-50` and `bg-emerald-600`. New screens use only the Karma names. After the event, a search for `slate-`, `emerald-`, `red-`, `amber-`, `sky-`, `violet-` and `text-xs` in new code finds anything that slipped through.

## From today's classes to Karma's

| Today | Karma | What changes |
| --- | --- | --- |
| `bg-slate-50` page | `bg-page` | nothing |
| `bg-white` cards, header, footer | `bg-surface` | nothing |
| `border-slate-200` hairlines | `border-line` | nothing |
| `text-slate-900` / `-600` / `-500` | `text-ink` / `text-ink-secondary` / `text-ink-muted` | the dark becomes `carbon` `#131313`, the greys turn neutral (`#4A4A4A`, `#6E6E6E`); `ink-muted` only for optional metadata on white |
| `bg-slate-900 text-white` button | `bg-action text-action-ink` | fill `#131313`, hover the brand `navy` `#132774` |
| `text-sky-700` links, NCT IDs | `text-link` (an alias of `cobalt`) | sky-700 → `cobalt` `#2443B8`; the bright `accent` `#4965EB` is for focus rings and selected edges; underline links inside sentences |
| `font-sans` (Inter), `font-mono` (system) | `font-sans`, `font-mono` | Geologica, sharp, and Overpass Mono, both self-hosted |
| violet badge | `text-fictional-ink bg-fictional-tint border-fictional-line` | nothing |
| slate badge | `text-frozen-ink bg-frozen-tint border-frozen-line` | border slate-300 → slate-400 |
| emerald-600 circle, white ✓ | `fill-state-met-solid`, `stroke-state-met-glyph` | teal-800 `#115E59`: darker and bluer |
| emerald-50 / -200 / -800 pill | `bg-state-met-tint border-state-met-line text-state-met-ink` | quieter grey-green `#EFF8F6` / `#A7CFC9`, text teal-900 |
| red-600 circle, white ✗ | `fill-state-not-met-solid`, `stroke-state-not-met-glyph` | a slightly warmer red, `#D6341C`, now a **square** |
| red-50 / -200 / -800 pill | `bg-state-not-met-tint border-state-not-met-line text-state-not-met-ink` | text red-800 → red-900 |
| slate-500 circle, white dash | `stroke-state-not-found-solid` | a **hollow dashed ring** |
| slate-100 / -300 / -700 pill | `bg-state-not-found-tint border-dashed border-state-not-found-line text-state-not-found-ink` | white fill, dashed slate-500 border |
| amber-500 circle, white ! | `fill-state-clinician-solid stroke-state-clinician-edge`, `fill-state-clinician-glyph` | amber-400 **diamond**, dark amber-950 "!", amber-800 edge |
| amber-50 / -200 / -900 pill | `bg-state-clinician-tint border-state-clinician-line text-state-clinician-ink` | nothing |
| `text-xs` (12px) pills, badges, labels | `text-small`, or `text-label uppercase` | 12px → 14px |
| 15px body, 28px bold title | `text-body`, `text-title` | nothing |

## Don't, in new screens

- `text-xs`, `text-[11px]`, `text-[12px]` or anything under 14px.
- Raw palette colours (`bg-red-50`, `text-emerald-700` …). If a colour has no token, it has no meaning yet: ask before adding one.
- `overflow-hidden` on a container whose header must stick; use `overflow-clip`.
- `outline-none` without a replacement focus style.
