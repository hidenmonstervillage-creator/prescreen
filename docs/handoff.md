# Handoff: Atlas pre-screen funnel

The product as deployed on the night of 2026-10-10 to 2026-10-11. Rules: `CLAUDE.md` (read it first). Repo: https://github.com/hidenmonstervillage-creator/prescreen. Production: https://prescreen-tau.vercel.app (Vercel project `prescreen`, functions in dub1, no Git link). `/api/health` returns the deployed commit.

## What it is

CROs run each trial through a fixed list of contracted sites, mostly big-city hospitals; patients elsewhere are never screened. Atlas lets a doctor at any hospital, or the patient, pre-screen against one trial's criteria and refer the patient, consented and referral-ready, to a contracted trial site.

- **The CRO buys.** Pricing (`/pricing`): CRO, "Per trial or per country. €[X] per pre-screened lead delivered, plus €[Z] when the patient enrols." and "Trial plan: €990 per trial per month, [N] leads included, success fee on top."; referring hospital, "Pays nothing. Earns [Y]% of every fee. Trial setup free."; patient, "Free."; then "No verdicts. Every line cited. Missing means not found, never guessed." and "First 10 leads per trial free to the CRO."
- **The referring hospital runs Atlas.** Its research team publishes the pre-screen, reads the hospital inbox, and confirms rows. One hospital per deployment: `HOSPITAL_NAME` (set in production) is the name on the lead pack ("Referred from: ..."), else "[Hospital name]" (`lib/hospital.ts`).
- **The research team at the contracted trial site receives the lead pack.** Atlas says nothing about travel, reimbursement, scheduling or the screening visit.
- Landing hero: "Trials run through a dozen hospitals. Patients are everywhere else." and "Atlas lets a doctor at any hospital pre-screen a patient against a trial's criteria and refer them, consented and referral-ready, to a contracted trial site. CROs get patients their site network never sees."

## Roles and words

- UI copy says hospital, research team and hospital inbox, never "site". The one exception is the place a patient is referred to: "trial site", "contracted trial site", "site network". Facility names quoted from ClinicalTrials.gov are source. `tests/copy.render.test.tsx` enforces it on the rendered screens.
- Exactly four states per criterion: met, not met, not found, needs a clinician (`met`, `not_met`, `not_found`, `needs_clinician`). `components/StateCell.tsx` is the only renderer of a state. In copy, needs a clinician is "for the research team".
- No verdicts: the banned words live in `lib/wording.ts` (the only file that may spell them); `tests/ui.wording.test.ts` scans the repo, this file included. The two allowed uses are the inbox footer, "A criteria map, not an eligibility decision. Every line quotes its source.", and the lead pack footer, "A criteria map, not an eligibility decision. Every line quotes its source. The research organisation makes the eligibility decision." Never "match", "viable" or "finder" in copy, and a lead is "pre-screened" (`CLAUDE.md` rule 3 names the word it replaces). The disabled Karma button, "Request records for a full match", caption "coming: Karma", is the one exception to "match". No em dashes anywhere.
- Fictional patients only. "Fictional patient" sits after every patient name (inbox, map, pack).

## The four doors

| Door | Route | Who | What it does |
|------|-------|-----|--------------|
| Find a trial | `/find` | public | Condition, stage or markers, city. Recruiting studies in Bulgaria from ClinicalTrials.gov, at most 5, published pre-screens first; per study the recruiting sites in Bulgaria, plain-word lines for the top criteria (one gpt-4o call per study, cached in `finder_rewrites`), and "Pre-screen this patient" or "Not on the platform yet". The page does not name itself. |
| Public pre-screen | `/s/[slug]` | public | The questions in screens of four ("Screen 1 of 4 · questions 1 to 4 of 12"), then a contact screen with the required consent box. Intro: "Answer these questions with your doctor, or on your own. You can choose "Not sure" or leave a question blank. The research team at the trial site reads your answers and contacts you." After submit only "Thank you. The research team will contact you." No result is ever shown to the submitter. |
| Hospital inbox | `/site/inbox`, `/site/inbox/[id]`, `/site/inbox/pack` | research team | One row per submission with the four counts, the referral-ready label and the "Confirmed by coordinator" checkbox; filters; the criteria map per submission with its summary card; the lead pack preview and PDF. |
| New trial | `/site/trials/new` | research team | Paste an NCT ID, "Fetch and generate", review the checklist (every criterion with its quote and whether a question asks it) and the questions with "How answers are read", then Publish. The generation summary sits above. |

`/site` is the passcode gate (httpOnly cookie for 30 days; 5 wrong attempts per 10 minutes per address, then 429). `middleware.ts` and a session check in each page and route gate everything under `/site` and `/api/site`.

## Generation (New trial)

`lib/generate.ts` `generateForTrial`, in this order. Model: gpt-4o, temperature 0, JSON schema output, called with `fetch` from `lib/openai.ts`. Every check is code; the model's output is never stored unchecked.

1. **Criteria split** (model): one item per bullet or numbered line, quotes verbatim (whitespace and markdown escapes aside), `askable` true when a patient answer could settle it at least one way. One re-ask for items that fail the checks; still failing items are dropped and reported.
2. **Permission guard** (`permissionGuard`, `lib/must-ask.ts`): a criterion whose stem (first clause, before a full stop, a semicolon or "Note:") is a permission ("may have received", "is allowed", "is permitted", "can be included", and the "are ... to continue" form spelled in `lib/wording.ts`) goes to the research team: not askable, reason "a permission, not a requirement". A patient answer can never give it met or not met.
3. **Half-life guard** (`halfLifeGuard`, `lib/rule-guard.ts`): a time window measured in half-lives ("2 weeks (14 days) or 5 half-lives, whichever is shorter") goes to the research team: a patient cannot know a half-life, so no day count settles it.
4. **Must-ask table** (`applyMustAsk`, `lib/must-ask.ts`): facts a patient always knows are asked in code, also when the split marked them not askable. Each matched criterion gets one plain question (yes, no, not sure, or a number) and a rule computed in code; an answer counts only when it settles the whole criterion in that direction, otherwise it maps to not found. These questions come first (q1 to qk).

   | Fact | Question | Registry wordings it recognises (examples) |
   |------|----------|--------------------------------------------|
   | age | "Are you N or older?", or "How old are you? Answer in years." for a range; sex and menopause folded in when the criterion names them | "Males and females at least 18 years of age."; "Male or female aged ≥ 18 years and < 75 years" |
   | sex | "Are you a woman?" / "Are you a man?" | "Female patients" |
   | menopause | "Are you a woman who has (not yet) been through the menopause?" | "Postmenopausal women" |
   | pregnancy or breastfeeding | "Are you pregnant or breastfeeding at the moment?" | "Pregnant or lactating female." |
   | other cancers | "Apart from the cancer you have now, have you had another cancer in the past N years?" (or ever) | "History of prior malignancy within 2 years prior to randomization" |
   | current medicines | "Are you taking or receiving any medicines or treatments at the moment, including supplements?" (or in the past N days, weeks or months); only "no" settles it | "Concomitant use of strong CYP3A4 inhibitors" |
   | prior treatment | "Have you ever been treated with <the drug or class named>?" | "Previous exposure to IM-101" |
   | visits | "Would you be able to come to the trial site for regular visits during the trial?" | "Willing and able to attend scheduled study visits" |

   Every entry lists at least two phrasings; `tests/must-ask.test.ts` checks each, plus 11 age criteria copied from ClinicalTrials.gov records. The table's report (`generation.questions.must_ask`) names the question per criterion, or why a matched criterion was left to the model.
5. **Questions** (model) for the askable criteria the table did not ask, within the slots left under 12 (between 8 and 12 in total when the table asked nothing). One whole-set re-ask for count, wording or rule problems; then drops, double links removed, the 12 limit.
6. **Polarity and time-window guards** (`ruleRejections`, `lib/rule-guard.ts`), on every model rule before it is stored:
   - **Polarity.** A yes or no question, or a choice whose every option starts with "Yes" or "No", asks affirmatively: its stem may not contain "not", "never", "without", "no longer", "cannot" or a word ending in n't. Its rule has one shape: "yes" may only confirm the criterion's text and "no" may only deny it (or settle nothing, which maps to not found). Read with the section: inclusion, yes gives met and no gives not met; exclusion, yes gives not met and no gives met. Code-written table rules are exempt: for a negated criterion ("No prior treatment with X") the table's "yes" denies it.
   - **Time windows.** A criterion with a time window ("within N days, weeks or months", "N days following", "at least N weeks since", "in the last N months", a washout) that the table does not ask may only be served by a number question that asks for the number ("How many weeks ago ...", "How long", "When") and whose rule compares it in `confirm_range` or `deny_range`. A yes or no question, a choice, or a number question that does not ask for the number is refused.
   - A refused rule leaves its question (a question left with no criterion is dropped). The criterion is re-asked **once, on its own** ("questions re-ask e6"): one fresh call about that criterion only, told how it failed and to ask it affirmatively (and, for a window, to ask how long ago). If the second answer passes every check it is kept; if not, the criterion goes to the research team: not askable, reason "the answer alone cannot settle it" or "a time window the research team checks". A time-window criterion that no number question serves goes to the research team too.
7. **Generation summary** (`components/GenerationSummary.tsx`) on the New trial screen: "26 criteria: 11 a patient can answer, 15 for the research team. 11 questions.", then "N questions written, M criteria sent to the research team because the answer alone cannot settle them." with each criterion and its reason, then "R model rules refused by the polarity and time-window checks; C criteria re-asked once, P passed the second time.", then the model, calls and tokens. Stored in `trials.generation` (`questions.must_ask`, `questions.rejected_rules`, `questions.reasked_criteria`, `research_team`).

## How a criterion gets its state

1. Not askable (labs, imaging, pathology, genetic results, a clinician's judgment, a permission, a half-life window, a criterion the guards sent to the research team): **needs a clinician**.
2. Served by no question, or its question unanswered or "Not sure": **not found**.
3. `yes_no`, `choice`, `number`: mapped in code from the question's `rules` (`lib/mapping.ts`); an answer in neither list or range is **not found**.
4. `free_text`: one model call per criterion returns a state and a quote; the quote must be a verbatim substring of the answer, else **not found**.
5. Exclusion criteria: an answer confirming the excluded condition gives **not met**. Code does that flip, never the model.

## Consent

The public page's contact screen has one required checkbox above the submit button, English and Bulgarian side by side (`CONSENT_TEXT`, `lib/consent.ts`). Submit stays disabled until it is ticked; `submitAnswers` refuses without a literal `consent: true` (400, nothing stored) and stores `consent_given` and `consent_at`; the anon INSERT policy requires it too (migration 0003).

## Referral-ready, confirmation, summary card, lead pack

- **referral_ready** (`lib/referral.ts`): `not_met == 0` on a map that exists. Not found and needs a clinician are counted and shown; they never block it. Computed in code, never stored. Shown as the neutral "referral-ready" label.
- **Confirmed by coordinator**: the checkbox per inbox row (`/api/site/submissions/[id]/confirm`); `confirmed_at` is set exactly when it is ticked.
- **Summary card** (`lib/summary.ts`, `components/SummaryCard.tsx`), from the counts, no model, never a percentage: "Referral-ready. 12 of 19 patient-answerable criteria met, 0 contradicted, 7 to confirm at the trial site. 15 criteria are for the research team." or "Not referral-ready: 1 criterion contradicted (e11). 11 met, 7 to confirm. 15 criteria are for the research team." Patient-answerable is met + not met + not found; contradicted is not met (with its ids); to confirm is not found. A card under every criteria map; a line under the counts in the pack preview and the PDF.
- **Lead pack**: a patient goes in when referral-ready, confirmed by a coordinator, and with consent recorded (`packable`). "Build lead pack" opens the preview (`/site/inbox/pack`, one trial per pack); "Download PDF" fetches `/api/site/pack` with the exact submission ids the preview showed (409 if the selection changed). PDF (`lib/pack.ts`, pdf-lib): A4, one page per patient: trial title, "For the research team at the contracted trial site.", "Lead pack · NCT ID · Referred from: <hospital> · Date: <day>", the patient, consent, submitted and confirmation times, the counts line, the summary line, the matrix (criterion id and quote, state, question id and quoted answer, or why there is none), the questions as the patient read them, the pack footer and "Page i of N". The matrix shrinks from 9 pt until the patient fits one page (6.5 pt for the 34-criteria demo trial, margin 24 pt). Fonts: static Geologica TTFs in `public/fonts`. Download only; nothing is sent.

## Hospital inbox filters

UI only, no schema (`filterInboxRows` in `components/InboxTable.tsx`): a trial dropdown (every trial with a submission, "All trials (N)"), a search box over contact, trial title and NCT ID (every word must match, any case), and a readiness filter: All, Referral-ready, Referral-ready and confirmed, Not referral-ready. They combine; the count line says "Showing N of M"; "Clear filters" resets them. Hooks: `data-filter-trial`, `data-filter-search`, `data-filter-ready` (the readiness select; it replaced the old "Referral-ready only" checkbox). The pack count above the list is over all rows, not the filtered ones. Filters reset on reload.

## Routes

Pages: `/`, `/find`, `/pricing`, `/site`, `/site/trials/new`, `/site/trials/[id]/kit` (printable kit: checklist, questionnaire, referral sheet), `/s/[slug]`, `/site/inbox`, `/site/inbox/[id]`, `/site/inbox/pack`. Tab titles: "Atlas" on the landing, "Atlas · <page name>" elsewhere.

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/health` | `{ ok, commit }`, commit from `BUILD_COMMIT` |
| POST | `/api/site/login` | passcode check, cookie, rate limit |
| POST | `/api/site/logout` | clears the cookie |
| POST | `/api/site/trials` | `{ nct, regenerate? }`: fetch, generate and store a draft trial; an existing trial is returned without spend |
| POST | `/api/site/trials/[id]/publish` | sets `slug` (NCT plus 8 random characters) and `published_at`; idempotent |
| POST | `/api/site/submissions/[id]/map` | rebuild one submission's map |
| POST | `/api/site/submissions/[id]/confirm` | `{ confirmed }`: the coordinator checkbox |
| GET | `/api/site/pack?trial=<id>&ids=<ids>` | the lead pack PDF |
| POST | `/api/s/[slug]/submit` | public: answers, contact and consent, then the map; returns only `{ ok: true }`; 10 per 10 minutes per address per trial, then 429 |

## Data model (Supabase, RLS on every table; migrations 0001 to 0003)

- **trials**: `id`, `nct_id` unique, `title`, `raw_eligibility` (verbatim criteria markdown), `criteria` jsonb (`{ id, section, quote, parent_quote, askable, not_askable_reason }`), `questions` jsonb (`{ id, text, type, options, criterion_ids, rules }`; each rule lists the answers or number ranges that confirm or deny the criterion's text), `slug` unique, `published_at`, `created_at`, `source` jsonb (status, conditions, sex, ages, sites; no contacts), `generation` jsonb (model, spend, re-asks, drops, the must-ask report, the guards' report). The public page gets only `id, text, type, options` of each question.
- **submissions**: `id`, `trial_id`, `answers`, `contact`, `created_at`, `consent_given`, `consent_at`, `confirmed_by_coordinator`, `confirmed_at`.
- **mappings**: `submission_id`, `criterion_id`, `state` (the four), `quoted_criterion`, `quoted_answer`, `question_id`.
- **login_attempts**, **submit_attempts** (keyed hashes of the address, for the rate limits), **finder_rewrites** (`/find` plain-word lines per NCT ID, reused while `prompt_version` and every quote still match).
- Access: anon may INSERT into `submissions` only, only for a published trial, only with consent, only `trial_id, answers, contact, consent_given, consent_at`; it can SELECT nothing (`npm run db:verify-rls`). Everything else goes through the server with the service role; `lib/supabase.ts` is server only. `lib/env-guard.ts` pins the Supabase project.

## The demo trial and the seed rows

**NCT06380751**: saruparib plus camizestrant or endocrine therapy, HR-positive HER2-negative BRCA1, BRCA2 or PALB2 mutated advanced breast cancer (AstraZeneca, Phase 3, recruiting; Plovdiv, Sofia, Stara Zagora). 34 criteria (19 a patient can answer, 15 for the research team), 12 questions, generated 2026-10-10 11:21 UTC before the must-ask table and the guards existed. **Never regenerate it.** Public page: https://prescreen-tau.vercel.app/s/nct06380751-md2jhsjd. Checked at the end of this session: questions hash `d6582aa8f1c349fd` (first 16 hex of the SHA-256 of the stored questions JSON), six submissions, mappings hash `22a19c4e8cc92c5d`, none confirmed by a coordinator.

The six inbox rows, all fictional, all with consent recorded (`npm run db:demo-consent`, Mike only):

| Row | Contact | Counts | Referral-ready |
|-----|---------|--------|----------------|
| Checkpoint | Mira Fictiva (fictional patient), +359 00 000 0000 | 9 met · 1 not met · 9 not found · 15 need a clinician | no (e6) |
| A | Lora Primerna (fictional patient), +359 00 000 0001 | 12 met · 0 not met · 7 not found · 15 need a clinician | yes |
| B | Vesela Izmislena (fictional patient), +359 00 000 0002 | 9 met · 0 not met · 10 not found · 15 need a clinician | yes |
| C | Petar Primerov (fictional patient), +359 00 000 0003 | 11 met · 1 not met · 7 not found · 15 need a clinician | no (e11) |
| | Nadya Izmislenova (fictional patient), +359 00 000 0004 | 12 met · 0 not met · 7 not found · 15 need a clinician | yes |
| | Darina Primerova (fictional patient), +359 00 000 0005 | 12 met · 0 not met · 7 not found · 15 need a clinician | yes |

To show a pack, tick "Confirmed by coordinator" on a referral-ready row; untick it afterwards (the data is production).

`/find` demo query: https://prescreen-tau.vercel.app/find?condition=breast+cancer&markers=&city=Plovdiv (NCT06380751 first, then NCT06727227 and NCT05774951, not on the platform).

## Production checks of the guards (2026-10-11)

Model calls on two test trials, both deleted afterwards (no trial other than NCT06380751 is stored).

- **NCT06064877** (ficlatuzumab plus cetuximab, head and neck, recruiting), on commit `606503e`: 26 criteria, 11 questions (5 from the table), 3 calls, 4923 tokens in, 2412 out. To the research team: i11 (permission: feeding tubes), e9 and i9 (time windows). 1 rule refused (e9, a yes or no on "within 6 months"), re-asked, failed again. The washout sub-items e4 to e7 came back as "How many days ago ..." number questions. After this run, the half-life guard was added: e4 and e5 ("or 5 half-lives, whichever is shorter") now go to the research team (tested with this trial's text, `tests/fixtures/NCT06064877.criteria.md`).
- **NCT06499285** (elritercept, MDS anaemia, 45 exclusions, recruiting), on commit `8a331c9`: 62 criteria, 11 questions (3 from the table), 5 calls, 16365 tokens in, 5833 out. To the research team: e30 (half-life), e8, e20, e26 to e29 (time windows). 2 rules refused (e8, e11), re-asked; e11 passed as a number question. After this run, the time-window guard was tightened: a number question must ask for the number; its "Have you had any major surgery in the last 28 days?" (typed number) is now refused (tested).

## Commands and tests

- `npm test` (Vitest): 241 passing, 4 skipped (the live tests, run with `LIVE=1`). `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Deploy (main only): `git rev-parse --short HEAD`, then `vercel --prod --build-env BUILD_COMMIT=<hash>`; check `/api/health`.
- `npm run env:check`, `npm run db:migrate`, `npm run db:verify-rls`, `npm run db:demo-consent` (the last three Mike only).

## Working on the UI (Ivayla)

- Branch `ui/<topic>` from `main`. Change `app/` pages and layouts, `components/`, styles and `tailwind.config.ts` only. Never deploy, never run migrations or seeds; Mike merges and deploys.
- Keep the `data-*` hooks in `CLAUDE.md` rule 9, plus `data-trial-nct` and `data-prescreen-link` on `/find`, `data-summary`, `data-filter-trial`, `data-filter-search`, `data-inbox-count`, `data-guard-summary`, `data-rejected-rules`.
- Design system: `docs/design-system/` (Karma's, vendored; `VENDORED.md` lists the edits); semantic Tailwind classes, recipes in `components/ui.ts`, fonts from `public/fonts`. The wordmark is "Atlas"; no Karma name in the UI except the disabled Karma button. The landing hero is the only dark surface. "Recruiting" and "referral-ready" are neutral pills, never green. One primary button per view.
- Data-backed pages need the service role key to run locally; `tests/matrix.render.test.tsx` renders the matrix from `tests/fixtures/NCT06380751.generated.json` without a database.

## NOT KNOWN

- **The guards on other trials.** Two production runs; the patterns (permission, time window, negative stem, half-life) are regular expressions and will miss or over-catch some registry wordings. A negated inclusion the table does not ask ("No prior chemotherapy") only passes if the model asks it so that "yes" means the text is true; otherwise it goes to the research team.
- **Direction of number rules on time windows.** The model writes the ranges; code checks only that a range exists and the question asks for a number, not which side is which. All 7 seen on production read the right way.
- **The two post-run guard changes** (half-life, asks for a number) are covered by tests with each trial's own text, not by a further production run.
- **Markdown `\^` escapes.** `unescapeMarkdown` (`lib/text.ts`) does not remove a backslash before `^`, so the split drops such lines (3 lab lines of NCT06499285: "kg/m\^2", "10\^9"). Not fixed.
- **The 12-question limit.** Askable criteria past it map to not found (13 on NCT06499285).
- **Age ranges** deny on one side only (one deny range per rule): for 18 to 74, 80 gives not met and 16 gives not found.
- **The current-medicines question** assumes an "or" in such a criterion joins more medicines; a non-medicine alternative would be denied by "no".
- **Model questions** are not held to one fact each (NCT06499285 asked contraception as one two-part choice).
- **No referring-doctor field.** The pack names the referring hospital only. Adding one needs a column, a field and a line on the pack.
- **The deployed PDF's words** are not machine-read (subset fonts); the page count and a local render of the same code are checked.
- **Screen widths.** The inbox, map and pack were checked in a 716 px pane only, not at a full desktop width or on a phone.
- **Long trials.** 62 criteria generated in about a minute; nothing above that has been tried (`maxDuration` is 300 s).
