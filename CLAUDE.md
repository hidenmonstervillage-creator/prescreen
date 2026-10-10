# Pre-screen funnel

Per-trial pre-screen funnel, run by hospitals and sold to CROs. The hospital's research team pastes an NCT ID; the app fetches the study from ClinicalTrials.gov, splits its criteria text into quoted criteria, writes plain-language questions, and publishes a public page. Each submission lands in the hospital inbox as a criterion-by-criterion map that quotes its sources; referral-ready rows a coordinator confirms go into a downloadable lead pack for the CRO. In UI copy the roles are hospital, research team and hospital inbox, never "site". The one exception is the place a patient is referred to: "trial site", "contracted trial site" and "site network" (landing, public page, pricing, lead pack); facility names quoted from ClinicalTrials.gov are source.

Built for the Crossroads AI Hackathon, started 2026-10-10. Screens, routes and data model: docs/handoff.md.

## Hard boundaries

- Never open, read, copy from, or run anything in `C:\Users\MIsho\trial-matcher` or `C:\Users\MIsho\onco-board`. This product ships with none of their code or data. Karma (trial-matcher) is related only as a vision.
- The product never calls Karma's engine, database or API. The only Karma touchpoint is a disabled button in the inbox labelled "Request records for a full match" with the caption "coming: Karma".

## Standing rules

1. **Fictional patients only.** No real records or real contact details anywhere, including seed data, fixtures and tests. Invented names, placeholder phones like `+359 00 000 0000`.
2. **Exactly four states per criterion:** met, not met, not found, needs a clinician (identifiers `met`, `not_met`, `not_found`, `needs_clinician`). `components/StateCell.tsx` is the only place a criterion state is rendered.
3. **No verdicts.** The words "eligible", "ineligible", "qualifies", "likely", any score or probability, and any sentence about eligibility as a whole never appear in UI text, generated output, copy, code identifiers or logs. `tests/ui.wording.test.ts` greps the repo and fails on them; the list lives in `lib/wording.ts` (the only other file allowed to spell them out). The word "eligibility" has two allowed uses: the inbox footer, "A criteria map, not an eligibility decision. Every line quotes its source." (`FOOTER_TEXT`), and the lead pack footer, which adds "The research organisation makes the eligibility decision." (`PACK_FOOTER_TEXT`), both in `lib/wording.ts`. User-facing copy also never says "viable", "finder" or "match" (the Karma button label is the one exception), and says "pre-screened", not "pre-qualified". Text quoted verbatim from ClinicalTrials.gov is source, not our copy.
4. **Everything shown about a submission cites its source:** the quoted criterion text and the quoted answer. Missing information is "not found", never inferred.
5. **No em dashes** in any copy, UI string, code, comment or doc. The same test enforces it. Use a comma, colon, full stop or a plain hyphen.
6. **Supabase is pinned.** `lib/env-guard.ts` pins `NEXT_PUBLIC_SUPABASE_URL` to the ref in `EXPECTED_SUPABASE_REF` and refuses to start otherwise; it explicitly refuses the refs `iljgvelfhpdcwhqzxbyf` and `xotegfqumptgxqywpzqo`. The service role key is server side only: never import `lib/supabase.ts` from a client component. The anon role may only INSERT into `submissions`; everything else goes through the server.
7. **Secrets.** `OPENAI_API_KEY` comes from the Windows environment, never from `.env.local`. Never print, log, commit or paste any secret value; refer to variables by name only.
8. **Branches.** Mike's sessions work on `main`. Ivayla's sessions work on `ui/*` branches and change the UI layer only: `app/` pages and layouts, `components/`, styles, `tailwind.config.ts`. Not `app/api/`, `lib/`, `supabase/`, `scripts/`. Ivayla never deploys and never runs migrations or seeds.
9. **Stable hooks.** Keep these `data-*` attributes when restyling: NCT input `data-nct-input`, Publish button `data-publish`, criterion row `data-criterion-id`, question `data-question-id`, submit button `data-submit`, inbox row `data-submission-id`, matrix cell `data-state`, consent box `data-consent-input`, inbox filter `data-filter-ready`, referral-ready label `data-referral-ready`, coordinator checkbox `data-confirm`, Build lead pack `data-build-pack`, Download PDF `data-download-pack`.
10. **Every change ends with:** `npm test`, `npx tsc --noEmit`, deploy with `vercel --prod --build-env BUILD_COMMIT=<hash>` (main only), and a click check on the deployed URL.
11. **Report format:** what changed, how verified, spend, NOT KNOWN.

## Stack

Next.js 14 App Router, TypeScript, Tailwind v3, Vitest. Supabase JS client with the service role, server side only. OpenAI `gpt-4o` at temperature 0 with JSON output, called with `fetch` from `lib/`. Vercel project `prescreen` (Hobby, functions in `dub1`, `maxDuration` 300 on API routes, no Git link).

Next 14 is past its patch line: use API routes, not Server Actions; no rewrites; no `next/image`.

## Commands

- `npm run dev`: local dev server
- `npm test`: Vitest, includes the wording test
- `npx tsc --noEmit`: type check
- `npm run env:check`: which `.env.local` keys are set, then the env guard (names only)
- `npm run db:migrate`: apply `supabase/migrations` over `SUPABASE_DB_URL` (Mike only)
- `git rev-parse --short HEAD` then `vercel --prod --build-env BUILD_COMMIT=<hash>`: deploy; `/api/health` returns the commit
