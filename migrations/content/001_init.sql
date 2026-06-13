-- Migration: 001_init — Table questions TCF Canada
-- Exécuter dans : Neon Console > SQL Editor

CREATE TABLE IF NOT EXISTS questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section     TEXT NOT NULL CHECK (section IN ('CO','CE','EE','EO')),
  level       TEXT NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  question    TEXT NOT NULL,
  options     JSONB,           -- NULL pour EE/EO (réponse libre)
  answer      TEXT,            -- NULL pour EE/EO
  explanation TEXT,
  audio_url   TEXT,            -- pour CO (compréhension orale)
  tags        TEXT[] DEFAULT '{}',
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_section_level
  ON questions(section, level)
  WHERE active = TRUE;
