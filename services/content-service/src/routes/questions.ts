import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { Section, Level } from '@prisma/client';

const router = Router();

const querySchema = z.object({
  section: z.nativeEnum(Section).optional(),
  level: z.nativeEnum(Level).optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
});

const sessionQuerySchema = z.object({
  section: z.enum(['EE', 'EO']),
  level: z.nativeEnum(Level).optional(),
});

// GET /questions — liste de questions (CO/CE)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { section, level, limit } = parsed.data;

  const questions = await prisma.question.findMany({
    where: {
      active: true,
      ...(section && { section }),
      ...(level && { level }),
      taskNumber: null, // exclure les tâches EE/EO qui font partie de sessions
    },
    select: {
      id: true, section: true, level: true, question: true,
      options: true, answer: true, explanation: true,
      audioUrl: true, transcript: true, theme: true,
      tags: true, imageUrl: true, timeLimitMin: true,
    },
    take: limit,
  });

  const shuffled = questions.sort(() => Math.random() - 0.5);
  res.json({ questions: shuffled, total: shuffled.length });
});

// GET /questions/session — session complète EE ou EO (3 tâches)
router.get('/session', async (req: Request, res: Response): Promise<void> => {
  const parsed = sessionQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { section, level } = parsed.data;

  // Récupérer tous les groupes disponibles
  const groups = await prisma.question.findMany({
    where: {
      active: true,
      section,
      sessionGroup: { not: null },
      taskNumber: 1, // une ligne par session
      ...(level && { level }),
    },
    select: { sessionGroup: true, level: true, theme: true },
  });

  if (groups.length === 0) {
    // Fallback : essayer sans filtre de niveau
    const allGroups = await prisma.question.findMany({
      where: { active: true, section, sessionGroup: { not: null }, taskNumber: 1 },
      select: { sessionGroup: true, level: true, theme: true },
    });
    if (allGroups.length === 0) {
      res.status(404).json({ error: 'Aucune session disponible pour cette section.' });
      return;
    }
    const pick = allGroups[Math.floor(Math.random() * allGroups.length)];
    const tasks = await prisma.question.findMany({
      where: { sessionGroup: pick.sessionGroup, active: true },
      orderBy: { taskNumber: 'asc' },
    });
    res.json({ session: { group: pick.sessionGroup, level: pick.level, theme: pick.theme, tasks } });
    return;
  }

  // Choisir un groupe aléatoire
  const pick = groups[Math.floor(Math.random() * groups.length)];
  const tasks = await prisma.question.findMany({
    where: { sessionGroup: pick.sessionGroup, active: true },
    orderBy: { taskNumber: 'asc' },
  });

  res.json({ session: { group: pick.sessionGroup, level: pick.level, theme: pick.theme, tasks } });
});

// GET /questions/mock-exam
router.get('/mock-exam', async (_req: Request, res: Response): Promise<void> => {
  const [co, ce] = await Promise.all([
    prisma.question.findMany({ where: { active: true, section: 'CO', taskNumber: null }, take: 10 }),
    prisma.question.findMany({ where: { active: true, section: 'CE', taskNumber: null }, take: 10 }),
  ]);

  // Pour EE/EO, prendre 1 session complète de chaque
  const eeGroup = await prisma.question.findFirst({ where: { active: true, section: 'EE', taskNumber: 1 }, select: { sessionGroup: true } });
  const eoGroup = await prisma.question.findFirst({ where: { active: true, section: 'EO', taskNumber: 1 }, select: { sessionGroup: true } });

  const [ee, eo] = await Promise.all([
    eeGroup?.sessionGroup ? prisma.question.findMany({ where: { sessionGroup: eeGroup.sessionGroup }, orderBy: { taskNumber: 'asc' } }) : Promise.resolve([]),
    eoGroup?.sessionGroup ? prisma.question.findMany({ where: { sessionGroup: eoGroup.sessionGroup }, orderBy: { taskNumber: 'asc' } }) : Promise.resolve([]),
  ]);

  const shuffle = <T>(arr: T[]) => arr.sort(() => Math.random() - 0.5);
  res.json({
    exam: { CO: shuffle(co), CE: shuffle(ce), EE: ee, EO: eo },
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
