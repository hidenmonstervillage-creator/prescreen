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

**Checkpoint run, 2026-10-10 14:23, on https://prescreen-tau.vercel.app (done):**
- Generation on the deployed app: 34 criteria (19 a patient can answer, 15 for the site team), none dropped or re-asked; 12 questions after one re-ask (q9 had one "yes" confirming both hepatitis and HIV; the re-ask returned 13, q13 was dropped by the 12 limit). gpt-4o, 3 calls, 5972 tokens in, 3812 out.
- Public page: https://prescreen-tau.vercel.app/s/nct06380751-md2jhsjd
- Fictional submission ("Mira Fictiva (fictional patient), +359 00 000 0000"): counts line **9 met · 1 not met · 9 not found · 15 need a clinician**. e6 ("History of another primary malignancy", answered yes) shows the exclusion flip; q5 "Not sure" and the blank q12 are not found.
- Screenshots: `reports/A1/checkpoint-matrix-01.jpg` to `-07.jpg` (local, gitignored).

## The five screens

| # | Screen | Route | Who | What it does |
|---|--------|-------|-----|--------------|
| 1 | Passcode gate | `/site` | site staff | One passcode field. Sets an httpOnly cookie for 30 days. 5 wrong attempts per 10 minutes per address, then 429. Signed-in staff go on to the inbox. |
| 2 | New trial | `/site/trials/new` | site staff | Paste an NCT ID, fetch from ClinicalTrials.gov, generate. Shows the criteria checklist (every line with its quote) and the questions side by side with the source criteria text. Publish creates the slug and the public page. "Download kit" is a stub for now (Ivayla's session builds the export). |
| 3 | Public pre-screen | `/s/[slug]` | public | The questions, a contact field, submit. Confirmation text only: "Thank you. The site will contact you." No result is ever shown to the submitter. |
| 4 | Inbox | `/site/inbox` | site staff | One row per submission: trial, date, contact. |
| 5 | Submission map | `/site/inbox/[submissionId]` | site staff | The matrix: criterion quote, state (colour + icon + word, `StateCell` only), quoted answer. Counts line "N met · M not met · K not found · J need a clinician". Disabled "Request records for a full match" button, caption "coming: Karma". Footer: "A criteria map, not an eligibility decision. Every line quotes its source." |

## Routes

Pages: `/`, `/find` (public, added in A2), `/site`, `/site/trials/new`, `/s/[slug]`, `/site/inbox`, `/site/inbox/[submissionId]`.

API (all server side, service role; built in session A1):

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/health` | `{ ok, commit }`, commit from `BUILD_COMMIT` |
| POST | `/api/site/login` | passcode check, cookie, rate limit |
| POST | `/api/site/logout` | clears the cookie |
| POST | `/api/site/trials` | `{ nct, regenerate? }` to fetch, generate and store a draft trial (an existing trial is returned without spend) |
| POST | `/api/site/trials/[id]/publish` | set `slug` (NCT plus 8 random characters) and `published_at`; idempotent |
| POST | `/api/site/submissions/[id]/map` | rebuild one submission's map if the first build failed |
| POST | `/api/s/[slug]/submit` | public: store answers and contact, then the mappings; returns only `{ ok: true }`. 10 per 10 minutes per address per trial, then 429 (A2) |

Site pages and site API routes are gated twice: `middleware.ts`, then a session check inside each page and route.

## Data model (Supabase, RLS on for every table)

- **trials**: `id` uuid, `nct_id` text unique, `title`, `raw_eligibility` text (verbatim criteria markdown), `criteria` jsonb, `questions` jsonb, `slug` text unique, `published_at` timestamptz, `created_at`. Added in A1: `source` jsonb (ClinicalTrials.gov status, conditions, sex, ages, sites; no contacts) and `generation` jsonb (model, token spend, re-asked and dropped items).
  - `criteria[]`: `{ id: "i1" | "e1", section: "inclusion" | "exclusion", quote, parent_quote, askable, not_askable_reason }`. `quote` (and `parent_quote`, the line that introduces a numbered sub-list) is a verbatim substring of the visible criteria text: whitespace normalised, markdown backslash escapes removed.
  - `questions[]`: `{ id, text, type: "yes_no" | "choice" | "number" | "free_text", options, criterion_ids, rules }`. Each rule lists, per criterion served, the answers (or number ranges) that confirm the criterion's text and those that deny it; code turns that into met or not met per section. The public page gets only `id, text, type, options`.
- **submissions**: `id`, `trial_id` fk, `answers` jsonb, `contact` text, `created_at`.
- **mappings**: `id`, `submission_id` fk, `criterion_id` text, `state` in `met`, `not_met`, `not_found`, `needs_clinician`, `quoted_criterion`, `quoted_answer`. Added in A1: `question_id`.
- **login_attempts** (added in A1): wrong passcodes by keyed hash of the address, for the 5 per 10 minutes limit.
- **finder_rewrites** (added in A2): `nct_id` primary key, `lines` jsonb (`[{ criterion_id, section, text, quote }]`), `report` jsonb (model, `prompt_version`, token spend, dropped lines and why), `created_at`. The plain-word lines for `/find`, one row per NCT ID.
- **submit_attempts** (added in A2): `ip_hash`, `trial_id`, `created_at`. Every POST to the public submit route for a published trial, for the 10 per 10 minutes limit.
- Access: anon may INSERT into `submissions` only, and only for a published trial; it can SELECT nothing (verified with the anon key: `npm run db:verify-rls`). Everything else goes through the server with the service role.

## How a criterion gets its state

1. Not askable (labs, imaging, pathology detail, genetic results the patient would not know, a clinician's judgment): **needs a clinician**.
2. Served by no question, or its question unanswered: **not found**.
3. `yes_no`, `choice`, `number`: mapped in code from the question's `rules`; any other answer is **not found**.
4. `free_text`: one model call per criterion returns a state and a quote; the quote must be a verbatim substring of the answer, else **not found**.
5. Exclusion criteria: an answer confirming the excluded condition gives **not met**. Code does that flip, never the model.

## Working on the UI (Ivayla)

- Branch `ui/<topic>` from `main`. Change `app/` pages and layouts, `components/`, styles and `tailwind.config.ts` only.
- Keep each screen piece its own component, and keep the `data-*` hooks: `data-nct-input`, `data-publish`, `data-criterion-id`, `data-question-id`, `data-submit`, `data-submission-id`, `data-state`, and on `/find` `data-trial-nct` (each result) and `data-prescreen-link` (the button). `tests/finder.render.test.tsx` checks the last two.
- `StateCell` is the only component that renders a criterion state.
- Run `npm test` before pushing: the wording test fails on verdict words and em dashes.
- Never deploy, never run migrations or seeds; Mike merges and deploys.
- Open question: the data-backed pages need the Supabase service role key to run locally. Until Mike decides how to share it (or adds a fixture mode), `tests/matrix.render.test.tsx` renders the matrix from `tests/fixtures/NCT06380751.generated.json` without a database.

## Finder and demo rows (session A2, 2026-10-10)

Deployed: commit `512a73a` (finder, submit rate limit), then `e82535a` (plainer criteria lines, prompt version in the cache). Both on https://prescreen-tau.vercel.app, functions in dub1.

**`/find`, public, no passcode.** Heading "Find a recruiting trial for a patient"; the subline says the site contacts the patient after the pre-screen. It is a door into the per-trial pre-screens, never a product of its own: the page does not name itself. Form (plain GET, so a result list is a shareable URL): condition, stage or markers (optional), city.
- Search (`lib/finder.ts`, `lib/ctgov.ts`): `query.cond` = condition plus the markers text, `filter.overallStatus=RECRUITING`, `query.locn` = city + ", Bulgaria", `pageSize` 10. Under 3 results: a second search with `query.locn=Bulgaria`, merged after the city results. At most 5 shown.
- Each result: NCT link, title, phase, overall status, recruiting sites in Bulgaria (facility and city only; no staff contacts are ever read), "Top criteria in plain words", and either "Pre-screen this patient" to `/s/<slug>` (published on the platform) or "Not on the platform yet" with the site cities.
- Plain-word lines: one gpt-4o call per study (temperature 0, JSON). Criterion ids are numbered in code from the criteria text with the generation convention (an introducing line ending in a colon is not an item; its sub-items are), so for NCT06380751 they match the inbox ids exactly (`tests/finder.test.ts`). The model returns only `criterion_id` and `text`; code attaches the verbatim criterion, shown on hover (title) and on expand (details). A line is dropped, never the study, when its id is unknown or repeated, it is empty or over 240 characters, it fails `wordingProblems` (verdict words, em dash), or it contains a number the criterion text does not.
- Cache: `finder_rewrites`, one row per NCT ID. A row is reused while its `report.prompt_version` equals `PLAIN_PROMPT_VERSION` and every line's quote still matches the current criteria text; otherwise the next search rewrites it. Bump `PLAIN_PROMPT_VERSION` whenever `PLAIN_SYSTEM` changes.
- A model failure shows the study with "Plain-word lines are not available right now." and caches nothing. `LIVE=1 npx vitest run tests/finder.live.test.ts` runs one real call on the NCT06380751 fixture.

**Demo query:** https://prescreen-tau.vercel.app/find?condition=breast+cancer&markers=&city=Plovdiv. The city search returns 3 studies, so there is no fallback:

| # | Study | Phase, status | Recruiting sites in Bulgaria | Next step |
|---|-------|---------------|------------------------------|-----------|
| 1 | NCT06727227, real-world trastuzumab deruxtecan, HER2-low | Phase not given, Recruiting | Burgas | Not on the platform yet |
| 2 | NCT06380751, saruparib (the demo trial) | Phase 3, Recruiting | Plovdiv, Sofia, Stara Zagora | Pre-screen this patient: `/s/nct06380751-md2jhsjd` |
| 3 | NCT05774951, camizestrant, early breast cancer | Phase 3, Recruiting | none listed as recruiting | Not on the platform yet |

NCT06380751 lines: i2, i3, i6, e6, e8. Warming the query cost 3 calls (4125 tokens in, 413 out); the repeat search made no model call (cache rows unchanged, 0.9 s).

**The four inbox rows (NCT06380751), all fictional, all sent through the deployed public submit route:**

| Row | Contact | Answers | Counts line | Rows that differ from A |
|-----|---------|---------|-------------|-------------------------|
| Checkpoint (A1) | Mira Fictiva (fictional patient), +359 00 000 0000 | q5 not sure, q7 yes, q12 blank | 9 met · 1 not met · 9 not found · 15 need a clinician | e3, e12 not found; e6 not met |
| A, the clean row | Lora Primerna (fictional patient), +359 00 000 0001 | all 12 answered: q1 post-menopausal woman, q2 yes, q3 to q12 no | 12 met · 0 not met · 7 not found · 15 need a clinician | (baseline) |
| B, the grey row | Vesela Izmislena (fictional patient), +359 00 000 0002 | as A, but q5 "Not sure", q8 and q12 blank | 9 met · 0 not met · 10 not found · 15 need a clinician | e3 (not sure), e8 and e12 (blank): not found |
| C, the red row | Petar Primerov (fictional patient), +359 00 000 0003 | as A (q1 adult male), but q11 tuberculosis "yes" | 11 met · 1 not met · 7 not found · 15 need a clinician | e11 "Active tuberculosis infection": not met (the exclusion flip) |

A's 7 not found are the askable exclusions no question serves (e13 to e18, e23); its 15 need a clinician are the criteria a patient cannot answer. All 12 questions are yes or no, or choice, so mapping these rows made no model call.

**Public submit rate limit:** 10 per 10 minutes per address per trial, then 429 with `retry-after: 600` and "Too many submissions from this address. Try again in 10 minutes." Every POST for a published trial counts, also one that fails validation; an unknown slug does not. Stored in `submit_attempts` as a keyed hash (`hashAddress(address, SITE_PASSCODE, "submit")`), the `login_attempts` pattern. Tested in `tests/submit.rate-limit.test.ts` and live: after A, B and C, seven invalid bodies got 400 and the 11th request got 429.
