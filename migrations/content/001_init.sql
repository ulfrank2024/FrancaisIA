-- Migration: 001_init — Schéma content (questions TCF Canada)

create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  section     text not null check (section in ('CO','CE','EE','EO')),
  level       text not null check (level in ('A1','A2','B1','B2','C1','C2')),
  question    text not null,
  options     jsonb,           -- null pour EE/EO (réponse libre)
  answer      text,            -- null pour EE/EO
  explanation text,
  audio_url   text,            -- pour CO (compréhension orale)
  tags        text[] default '{}',
  active      boolean default true,
  created_at  timestamptz default now()
);

create index if not exists idx_questions_section_level
  on public.questions(section, level)
  where active = true;

alter table public.questions enable row level security;
create policy "Service role full access" on public.questions
  for all using (true) with check (true);
