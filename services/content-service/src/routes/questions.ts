import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/supabase';

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

  let query = supabase
    .from('questions')
    .select('id, section, level, question, options, explanation, audio_url, tags')
    .eq('active', true)
    .limit(limit);

  if (section) query = query.eq('section', section);
  if (level) query = query.eq('level', level);

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des questions.' });
    return;
  }

  // Mélanger aléatoirement
  const shuffled = data?.sort(() => Math.random() - 0.5) ?? [];
  res.json({ questions: shuffled, total: shuffled.length });
});

// GET /questions/mock-exam — 1 examen complet simulé (toutes sections)
router.get('/mock-exam', async (_req: Request, res: Response): Promise<void> => {
  const sections: Array<'CO' | 'CE' | 'EE' | 'EO'> = ['CO', 'CE', 'EE', 'EO'];
  const perSection = 10;

  const results = await Promise.all(
    sections.map((s) =>
      supabase
        .from('questions')
        .select('id, section, level, question, options, explanation, audio_url')
        .eq('section', s)
        .eq('active', true)
        .limit(perSection)
    )
  );

  const exam: Record<string, unknown[]> = {};
  sections.forEach((s, i) => {
    exam[s] = results[i].data?.sort(() => Math.random() - 0.5) ?? [];
  });

  res.json({ exam, totalQuestions: sections.length * perSection });
});

// GET /questions/:id — une question avec la réponse (pour correction)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Question introuvable.' });
    return;
  }
  res.json(data);
});

export default router;
