# Input with label

A text field with its label above and its help or error below; errors are ink, not red.

## Recipe

- Label: `block text-small font-semibold text-ink`.
- Input: `h-10 w-full rounded-lg border border-control bg-surface px-3 text-body text-ink placeholder:text-ink-muted hover:border-control-hover disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-sunken disabled:text-disabled-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring`.
- Help: `mt-1.5 text-small text-ink-secondary`, linked with `aria-describedby`.

## Error

The border becomes `border-2 border-ink`, the input gets `aria-invalid="true"`, and the help text is replaced by the error: slashed-circle icon + one sentence in `text-small font-medium text-ink` that says how to fix it ("Start the ID with NCT, for example NCT09412345.").

Red is reserved for not met, so a form error never turns red.

## Rules

- Labels are always visible; a placeholder is an example, never the label.
- Placeholder text uses `ink-muted` (4.8:1 on white).
