# Demo badges

Two badges that must never be missed: **Fictional patient** on every demo patient, **Frozen demo** whenever the app runs the frozen demo data.

## When to use

- Fictional patient: right after the patient's name, everywhere the name appears (case card title, landing card, site-mode row, evidence panel title if it shows the name).
- Frozen demo: in the app header for the whole session, and on the landing demo card.

## Recipe

```html
<span class="inline-flex h-7 shrink-0 items-center rounded-md border border-fictional-line bg-fictional-tint px-2.5 text-label uppercase text-fictional-ink">Fictional patient</span>
<span class="inline-flex h-7 shrink-0 items-center rounded-md border border-frozen-line bg-frozen-tint px-2.5 text-label uppercase text-frozen-ink">Frozen demo</span>
```

## Rules

- Violet means "fictional patient" and nothing else. Don't use `fictional-*` anywhere else.
- 14px uppercase semibold (`text-label uppercase`), never smaller, never truncated, never hidden behind a menu or a hover.
- Badges are not buttons and cannot be dismissed.
- On a projector the tint washes out; the word and border carry the badge, so keep both.
