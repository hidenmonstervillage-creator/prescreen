# Handoff: pre-screen funnel

Per-trial pre-screen funnel for clinical trial sites. Rules: `CLAUDE.md` (read it first). Repo: https://github.com/hidenmonstervillage-creator/prescreen

## 22:00 checkpoint, 2026-10-10

On the deployed URL, not localhost: one real trial pasted, published, submitted against with a fictional patient, and showing in the inbox mapped criterion by criterion.

**Demo trial: NCT06380751.** Saruparib (AZD5305) plus camizestrant or endocrine therapy vs CDK4/6 inhibitor plus endocrine therapy in HR-positive, HER2-negative, BRCA1, BRCA2 or PALB2 mutated advanced breast cancer (AstraZeneca, Phase 3, RECRUITING). Chosen in session A1 from `GET /studies?query.cond=cancer&filter.overallStatus=RECRUITING&query.locn=Bulgaria` (55 results) because:
- 36 criteria lines (7 inclusion, 29 exclusion, two short numbered sub-lists), inside the 15 to 50 target.
- 3 of its 4 Bulgarian sites are themselves RECRUITING (Plovdiv, Sofia, Stara Zagora). The first pick, NCT05774951, was dropped because none of its Bulgarian sites was recruiting.
- A clear mix of patient-askable items (sex and menopausal status, advanced disease, other cancers, hepatitis, HIV, TB, recent surgery, hormone therapy, swallowing) and clinician-only items (histology, ECOG, tumour tissue, organ function, CYP drug interactions, QT drugs).
- No markdown escapes and no em dashes in the source text, so verbatim quoting is clean.

Fixture copy (contacts stripped): `tests/fixtures/NCT06380751.study.json`, verbatim criteria text: `tests/fixtures/NCT06380751.criteria.md`.

## The five screens

| # | Screen | Route | Who | What it does |
|---|--------|-------|-----|--------------|
| 1 | Passcode gate | `/site` | site staff | One passcode field. Sets an httpOnly cookie for 30 days. 5 wrong attempts per 10 minutes per address, then 429. Signed-in staff go on to the inbox. |
| 2 | New trial | `/site/trials/new` | site staff | Paste an NCT ID, fetch from ClinicalTrials.gov, generate. Shows the criteria checklist (every line with its quote) and the questions side by side with the source criteria text. Publish creates the slug and the public page. "Download kit" is a stub for now (Ivayla's session builds the export). |
| 3 | Public pre-screen | `/s/[slug]` | public | The questions, a contact field, submit. Confirmation text only: "Thank you. The site will contact you." No result is ever shown to the submitter. |
| 4 | Inbox | `/site/inbox` | site staff | One row per submission: trial, date, contact. |
| 5 | Submission map | `/site/inbox/[submissionId]` | site staff | The matrix: criterion quote, state (colour + icon + word, `StateCell` only), quoted answer. Counts line "N met · M not met · K not found · J need a clinician". Disabled "Request records for a full match" button, caption "coming: Karma". Footer: "A criteria map, not an eligibility decision. Every line quotes its source." |

## Routes

Pages: `/`, `/site`, `/site/trials/new`, `/s/[slug]`, `/site/inbox`, `/site/inbox/[submissionId]`.

API (all server side, service role; built in session A1):

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/health` | `{ ok, commit }`, commit from `BUILD_COMMIT` |
| POST | `/api/site/login` | passcode check, cookie, rate limit |
| POST | `/api/site/trials` | `{ nct }` to fetch, generate and store a draft trial |
| POST | `/api/site/trials/[id]/publish` | set `slug` and `published_at` |
| POST | `/api/s/[slug]/submit` | store answers and contact, then the mappings |

## Data model (Supabase, RLS on for every table)

- **trials**: `id` uuid, `nct_id` text unique, `title`, `raw_eligibility` text (verbatim criteria markdown), `criteria` jsonb, `questions` jsonb, `slug` text unique, `published_at` timestamptz, `created_at`.
  - `criteria[]`: `{ id: "i1" | "e1", section: "inclusion" | "exclusion", quote, askable, not_askable_reason }`. `quote` is a verbatim substring of `raw_eligibility`.
  - `questions[]`: `{ id, text, type: "yes_no" | "choice" | "number" | "free_text", options?, criterion_ids, rules }`. `rules` says, per criterion served, which answers make it met and which make it not met.
- **submissions**: `id`, `trial_id` fk, `answers` jsonb, `contact` text, `created_at`.
- **mappings**: `id`, `submission_id` fk, `criterion_id` text, `state` in `met`, `not_met`, `not_found`, `needs_clinician`, `quoted_criterion`, `quoted_answer`.
- Access: anon may INSERT into `submissions` only and SELECT nothing. Everything else goes through the server with the service role.

## How a criterion gets its state

1. Not askable (labs, imaging, pathology detail, genetic results the patient would not know, a clinician's judgment): **needs a clinician**.
2. Served by no question, or its question unanswered: **not found**.
3. `yes_no`, `choice`, `number`: mapped in code from the question's `rules`; any other answer is **not found**.
4. `free_text`: one model call per criterion returns a state and a quote; the quote must be a verbatim substring of the answer, else **not found**.
5. Exclusion criteria: an answer confirming the excluded condition gives **not met**. Code does that flip, never the model.

## Working on the UI (Ivayla)

- Branch `ui/<topic>` from `main`. Change `app/` pages and layouts, `components/`, styles and `tailwind.config.ts` only.
- Keep each screen piece its own component, and keep the `data-*` hooks: `data-nct-input`, `data-publish`, `data-criterion-id`, `data-question-id`, `data-submit`, `data-submission-id`, `data-state`.
- `StateCell` is the only component that renders a criterion state.
- Run `npm test` before pushing: the wording test fails on verdict words and em dashes.
- Never deploy, never run migrations or seeds; Mike merges and deploys.
