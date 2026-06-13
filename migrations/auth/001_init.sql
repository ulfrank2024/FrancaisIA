-- Migration: 001_init — Table users
-- Exécuter dans : Neon Console > SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  level         TEXT DEFAULT 'A1' CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
