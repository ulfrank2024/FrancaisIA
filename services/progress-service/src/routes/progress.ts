import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/supabase';

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

// POST /progress/results — enregistrer un résultat
router.post('/results', async (req: Request, res: Response): Promise<void> => {
  const parsed = resultSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { userId, section, score, total, correct, details, durationSeconds } = parsed.data;

  const { data, error } = await supabase
    .from('results')
    .insert({
      user_id: userId, section, score, total, correct,
      details, duration_s: durationSeconds,
    })
    .select('id, created_at')
    .single();

  if (error) {
    res.status(500).json({ error: "Erreur lors de l'enregistrement." });
    return;
  }
  res.status(201).json({ resultId: data.id, message: 'Résultat enregistré.' });
});

// GET /progress/dashboard/:userId — stats globales
router.get('/dashboard/:userId', async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId;

  const { data: results, error } = await supabase
    .from('results')
    .select('section, score, correct, total, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération.' });
    return;
  }

  const sections = ['CO', 'CE', 'EE', 'EO'] as const;
  const stats = sections.map((s) => {
    const sectionResults = results?.filter((r) => r.section === s) ?? [];
    const avg = sectionResults.length
      ? Math.round(sectionResults.reduce((sum, r) => sum + r.score, 0) / sectionResults.length)
      : null;
    return { section: s, averageScore: avg, attempts: sectionResults.length };
  });

  const totalAttempts = results?.length ?? 0;
  const globalAvg = totalAttempts
    ? Math.round((results ?? []).reduce((s, r) => s + r.score, 0) / totalAttempts)
    : null;

  res.json({ stats, globalAverage: globalAvg, totalAttempts });
});

// GET /progress/history/:userId — historique des examens
router.get('/history/:userId', async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('results')
    .select('id, section, score, total, correct, duration_s, created_at')
    .eq('user_id', req.params.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération.' });
    return;
  }
  res.json({ history: data ?? [] });
});

export default router;
