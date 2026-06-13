-- Migration: 001_init — Schéma auth
-- Exécuter dans Supabase Dashboard > SQL Editor

create schema if not exists auth_app;

create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  password_hash text not null,
  full_name   text not null,
  avatar_url  text,
  level       text default 'A1' check (level in ('A1','A2','B1','B2','C1','C2')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Index pour les lookups par email
create index if not exists idx_users_email on public.users(email);

-- Row Level Security
alter table public.users enable row level security;

-- Politique: service_role peut tout faire (utilisé par le backend)
create policy "Service role full access" on public.users
  for all using (true)
  with check (true);
