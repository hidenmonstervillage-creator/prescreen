-- 0003: consent and coordinator confirmation on submissions.
-- consent_given, consent_at: the required consent box on the public page. The server refuses
-- a submission without it, and so does the anon INSERT policy below.
-- confirmed_by_coordinator, confirmed_at: the inbox checkbox. With the referral-ready flag
-- (computed in code from the counts, never stored) it selects the patients for a lead pack.
-- Rows from before this migration keep consent_given false: nothing is assumed.

alter table public.submissions
  add column consent_given boolean not null default false,
  add column consent_at timestamptz,
  add column confirmed_by_coordinator boolean not null default false,
  add column confirmed_at timestamptz;

alter table public.submissions
  add constraint submissions_consent_at_check check (consent_given = (consent_at is not null)),
  add constraint submissions_confirmed_at_check check (confirmed_by_coordinator = (confirmed_at is not null));

-- anon may INSERT only the columns the public page sends, never the coordinator's two.
revoke insert on table public.submissions from anon;
grant insert (trial_id, answers, contact, consent_given, consent_at) on table public.submissions to anon;

-- ... and only for a published trial, with consent recorded.
drop policy submissions_anon_insert_published on public.submissions;
create policy submissions_anon_insert_published
  on public.submissions
  for insert
  to anon
  with check (private.trial_is_published(trial_id) and consent_given and consent_at is not null);
