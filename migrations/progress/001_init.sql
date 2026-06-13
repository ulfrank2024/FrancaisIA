-- Migration: 001_init — Schéma progress (scores & historique)

create table if not exists public.results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  section     text not null check (section in ('CO','CE','EE','EO','MOCK')),
  score       int not null check (score >= 0 and score <= 100),
  total       int not null,
  correct     int not null,
  details     jsonb default '[]',  -- [{question_id, user_answer, correct, score}]
  duration_s  int,                 -- durée en secondes
  created_at  timestamptz default now()
);

create index if not exists idx_results_user
  on public.results(user_id, created_at desc);

alter table public.results enable row level security;
create policy "Service role full access" on public.results
  for all using (true) with check (true);
