-- Migration: 001_init — Table results (scores & historique)
-- Exécuter dans : Neon Console > SQL Editor

CREATE TABLE IF NOT EXISTS results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section     TEXT NOT NULL CHECK (section IN ('CO','CE','EE','EO','MOCK')),
  score       INT NOT NULL CHECK (score >= 0 AND score <= 100),
  total       INT NOT NULL,
  correct     INT NOT NULL,
  details     JSONB DEFAULT '[]',
  duration_s  INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_user
  ON results(user_id, created_at DESC);
