# App header

The 64px white bar on every screen: logo, tagline, the Frozen demo badge when the frozen demo runs, and the main navigation.

## Recipe

- Bar: `h-16 border-b border-line bg-surface`; inner: `mx-auto flex h-full max-w-content items-center gap-5 px-5`.
- Logo: `karma-lockup-solid.svg` as inline SVG, 28px tall (`h-7 w-auto`), linked home with `aria-label="Karma, home"`. It is the solid drawing because the dotted one blurs below 64px (see **Wordmark**).
- Tagline: "Every criterion cited. Nothing inferred." `text-small text-ink-secondary`; hide it below 1024px rather than wrap it.
- Nav item: `inline-flex h-full items-center border-b-2 border-transparent px-3 text-body font-medium text-ink-secondary hover:border-line-strong hover:text-ink aria-[current=page]:border-ink aria-[current=page]:font-semibold aria-[current=page]:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-focus-ring`. The current page carries `aria-current="page"` and a 2px ink underline on the header's bottom edge.

## Rules

- Before the event only the logo changes in the live app: swap the "TRIAL MATCHER" text for the solid lockup, 28px tall inside the same 64px bar, and swap the favicon for `karma-icon.svg`. Nothing else in the header changes.
- Nav labels here are examples. Keep them to two words or fewer, sentence case.
