-- 0002: finder_rewrites (cached plain-word criteria lines per NCT ID, for /find) and
-- submit_attempts (public submit rate limit, 10 per 10 minutes per address per trial).
-- RLS on, nothing for anon or authenticated: only the server (service role) reads or writes them.

-- finder_rewrites: one row per NCT ID. lines: [{ criterion_id, section, text, quote }], where
-- quote is the verbatim criterion text attached in code. report: model, token spend, dropped lines.
create table public.finder_rewrites (
  nct_id text primary key check (nct_id ~ '^NCT[0-9]{8}$'),
  lines jsonb not null default '[]'::jsonb,
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- submit_attempts: every POST to /api/s/[slug]/submit for a published trial, by keyed hash of the address.
create table public.submit_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  trial_id uuid not null references public.trials (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index submit_attempts_ip_hash_trial_created_at_idx on public.submit_attempts (ip_hash, trial_id, created_at desc);

alter table public.finder_rewrites enable row level security;
alter table public.submit_attempts enable row level security;

revoke all on table public.finder_rewrites, public.submit_attempts from anon, authenticated;
grant all on table public.finder_rewrites, public.submit_attempts to service_role;
