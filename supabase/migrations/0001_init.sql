-- 0001_init: trials, submissions, mappings, login_attempts.
-- RLS is on for every table. The anon role may only INSERT into submissions, and only
-- for a published trial; it can SELECT nothing. Every other access goes through the
-- server with the service role (which bypasses RLS).

create schema if not exists private;

-- trials: one row per NCT ID, holding the verbatim criteria text and both generated blobs.
create table public.trials (
  id uuid primary key default gen_random_uuid(),
  nct_id text not null unique check (nct_id ~ '^NCT[0-9]{8}$'),
  title text not null,
  raw_eligibility text not null,
  criteria jsonb not null default '[]'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  -- ClinicalTrials.gov summary shown next to the checklist (status, conditions, sex, ages, locations).
  source jsonb not null default '{}'::jsonb,
  -- Generation report: model, token spend, dropped and re-asked items.
  generation jsonb not null default '{}'::jsonb,
  slug text unique check (slug is null or slug ~ '^[a-z0-9-]{6,80}$'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  check ((slug is null) = (published_at is null))
);

-- submissions: what a member of the public sent from /s/[slug].
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references public.trials (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  contact text not null check (char_length(contact) between 1 and 300),
  created_at timestamptz not null default now()
);
create index submissions_trial_id_idx on public.submissions (trial_id);
create index submissions_created_at_idx on public.submissions (created_at desc);

-- mappings: one row per criterion per submission, each quoting its sources.
create table public.mappings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  criterion_id text not null,
  state text not null check (state in ('met', 'not_met', 'not_found', 'needs_clinician')),
  quoted_criterion text not null,
  quoted_answer text,
  -- The question whose answer is quoted, when there is one.
  question_id text,
  unique (submission_id, criterion_id)
);

-- login_attempts: wrong /site passcodes, by hashed address, for the 5 per 10 minutes limit.
create table public.login_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index login_attempts_ip_hash_created_at_idx on public.login_attempts (ip_hash, created_at desc);

alter table public.trials enable row level security;
alter table public.submissions enable row level security;
alter table public.mappings enable row level security;
alter table public.login_attempts enable row level security;

-- Table privileges: nothing for anon or authenticated except INSERT on submissions.
revoke all on table public.trials, public.submissions, public.mappings, public.login_attempts from anon, authenticated;
grant insert on table public.submissions to anon;
grant all on table public.trials, public.submissions, public.mappings, public.login_attempts to service_role;

-- Policy helper in a schema the Data API does not expose, so it cannot be called as an RPC.
create or replace function private.trial_is_published(t uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.trials where id = t and published_at is not null);
$$;
revoke all on function private.trial_is_published(uuid) from public;
grant usage on schema private to anon;
grant execute on function private.trial_is_published(uuid) to anon;

create policy submissions_anon_insert_published
  on public.submissions
  for insert
  to anon
  with check (private.trial_is_published(trial_id));
