import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sql } from '../db/db';

const router = Router();

const querySchema = z.object({
  section: z.enum(['CO', 'CE', 'EE', 'EO']).optional(),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// GET /questions
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { section, level, limit } = parsed.data;

  let rows;
  if (section && level) {
    rows = await sql`
      SELECT id, section, level, question, options, explanation, audio_url, tags
      FROM questions WHERE active = true AND section = ${section} AND level = ${level}
      ORDER BY random() LIMIT ${limit}
    `;
  } else if (section) {
    rows = await sql`
      SELECT id, section, level, question, options, explanation, audio_url, tags
      FROM questions WHERE active = true AND section = ${section}
      ORDER BY random() LIMIT ${limit}
    `;
  } else if (level) {
    rows = await sql`
      SELECT id, section, level, question, options, explanation, audio_url, tags
      FROM questions WHERE active = true AND level = ${level}
      ORDER BY random() LIMIT ${limit}
    `;
  } else {
    rows = await sql`
      SELECT id, section, level, question, options, explanation, audio_url, tags
      FROM questions WHERE active = true
      ORDER BY random() LIMIT ${limit}
    `;
  }

  res.json({ questions: rows, total: rows.length });
});

// GET /questions/mock-exam
router.get('/mock-exam', async (_req: Request, res: Response): Promise<void> => {
  const sections = ['CO', 'CE', 'EE', 'EO'] as const;

  const [co, ce, ee, eo] = await Promise.all([
    sql`SELECT id, section, level, question, options, explanation, audio_url FROM questions WHERE active = true AND section = 'CO' ORDER BY random() LIMIT 10`,
    sql`SELECT id, section, level, question, options, explanation, audio_url FROM questions WHERE active = true AND section = 'CE' ORDER BY random() LIMIT 10`,
    sql`SELECT id, section, level, question, options, explanation, audio_url FROM questions WHERE active = true AND section = 'EE' ORDER BY random() LIMIT 10`,
    sql`SELECT id, section, level, question, options, explanation, audio_url FROM questions WHERE active = true AND section = 'EO' ORDER BY random() LIMIT 10`,
  ]);

  res.json({
    exam: { CO: co, CE: ce, EE: ee, EO: eo },
    totalQuestions: co.length + ce.length + ee.length + eo.length,
  });
});

// GET /questions/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const rows = await sql`SELECT * FROM questions WHERE id = ${req.params.id} LIMIT 1`;
  if (rows.length === 0) {
    res.status(404).json({ error: 'Question introuvable.' });
    return;
  }
  res.json(rows[0]);
});

export default router;
