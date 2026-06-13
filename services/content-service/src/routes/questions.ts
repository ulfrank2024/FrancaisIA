import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { Section, Level } from '@prisma/client';

const router = Router();

const querySchema = z.object({
  section: z.nativeEnum(Section).optional(),
  level: z.nativeEnum(Level).optional(),
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

  const questions = await prisma.question.findMany({
    where: { active: true, ...(section && { section }), ...(level && { level }) },
    select: { id: true, section: true, level: true, question: true, options: true, explanation: true, audioUrl: true, tags: true },
    take: limit,
  });

  // Mélanger aléatoirement
  const shuffled = questions.sort(() => Math.random() - 0.5);
  res.json({ questions: shuffled, total: shuffled.length });
});

// GET /questions/mock-exam
router.get('/mock-exam', async (_req: Request, res: Response): Promise<void> => {
  const [co, ce, ee, eo] = await Promise.all([
    prisma.question.findMany({ where: { active: true, section: 'CO' }, take: 10 }),
    prisma.question.findMany({ where: { active: true, section: 'CE' }, take: 10 }),
    prisma.question.findMany({ where: { active: true, section: 'EE' }, take: 10 }),
    prisma.question.findMany({ where: { active: true, section: 'EO' }, take: 10 }),
  ]);

  const shuffle = <T>(arr: T[]) => arr.sort(() => Math.random() - 0.5);
  res.json({
    exam: { CO: shuffle(co), CE: shuffle(ce), EE: shuffle(ee), EO: shuffle(eo) },
    totalQuestions: co.length + ce.length + ee.length + eo.length,
  });
});

// GET /questions/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const question = await prisma.question.findUnique({ where: { id: req.params.id } });
  if (!question) {
    res.status(404).json({ error: 'Question introuvable.' });
    return;
  }
  res.json(question);
});

export default router;
