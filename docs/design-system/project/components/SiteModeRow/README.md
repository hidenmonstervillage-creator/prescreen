# Site mode row

One patient against one trial in site mode: name, Fictional patient badge, the four count pills and the first not met criterion with its quote and source.

## Anatomy

- Name (`text-body font-semibold`, `lang="bg"`) and the Fictional patient badge for demo patients.
- The four count pills, right-aligned.
- First not met: "First not met · " + the criterion, the quote in quotation marks, its source chip, inside a `bg-page` well.
- No not met rows: one quiet line, "No “not met” rows for this patient."

## Rules

- Show the first not met row in the trial's own criterion order, not the "worst" one: Karma does not rank evidence.
- The row opens that patient's criterion matrix for this trial.
