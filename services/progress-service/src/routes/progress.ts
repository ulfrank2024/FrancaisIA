import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sql } from '../db/db';

const router = Router();

const resultSchema = z.object({
  userId: z.string().uuid(),
  section: z.enum(['CO', 'CE', 'EE', 'EO', 'MOCK']),
  score: z.number().int().min(0).max(100),
  total: z.number().int().min(1),
  correct: z.number().int().min(0),
  details: z.array(z.object({
    questionId: z.string(),
    userAnswer: z.string().optional(),
    correct: z.boolean(),
    score: z.number().optional(),
  })).default([]),
  durationSeconds: z.number().int().optional(),
});

// POST /progress/results
router.post('/results', async (req: Request, res: Response): Promise<void> => {
  const parsed = resultSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { userId, section, score, total, correct, details, durationSeconds } = parsed.data;

  const rows = await sql`
    INSERT INTO results (user_id, section, score, total, correct, details, duration_s)
    VALUES (${userId}, ${section}, ${score}, ${total}, ${correct}, ${JSON.stringify(details)}::jsonb, ${durationSeconds ?? null})
    RETURNING id, created_at
  `;

  if (rows.length === 0) {
    res.status(500).json({ error: "Erreur lors de l'enregistrement." });
    return;
  }
  res.status(201).json({ resultId: rows[0].id, message: 'Résultat enregistré.' });
});

// GET /progress/dashboard/:userId
router.get('/dashboard/:userId', async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId;

  const results = await sql`
    SELECT section, score, correct, total, created_at
    FROM results WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  const sections = ['CO', 'CE', 'EE', 'EO'];
  const stats = sections.map(s => {
    const sr = results.filter(r => r.section === s);
    const avg = sr.length
      ? Math.round(sr.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / sr.length)
      : null;
    return { section: s, averageScore: avg, attempts: sr.length };
  });

  const totalAttempts = results.length;
  const globalAverage = totalAttempts
    ? Math.round(results.reduce((s: number, r: { score: number }) => s + r.score, 0) / totalAttempts)
    : null;

  res.json({ stats, globalAverage, totalAttempts });
});

// GET /progress/history/:userId
router.get('/history/:userId', async (req: Request, res: Response): Promise<void> => {
  const rows = await sql`
    SELECT id, section, score, total, correct, duration_s, created_at
    FROM results WHERE user_id = ${req.params.userId}
    ORDER BY created_at DESC LIMIT 50
  `;
  res.json({ history: rows });
});

export default router;
