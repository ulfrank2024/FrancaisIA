import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';

const RESULT_SECTIONS = ['CO', 'CE', 'EE', 'EO', 'MOCK'] as const;
type ResultSection = typeof RESULT_SECTIONS[number];

const router = Router();

const resultSchema = z.object({
  userId: z.string().min(1),
  section: z.enum(RESULT_SECTIONS),
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

// Plans payants reconnus
const PAID_PLANS = ['bronze', 'silver', 'gold', 'pro', 'annual'];

// POST /progress/results
router.post('/results', async (req: Request, res: Response): Promise<void> => {
  const parsed = resultSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { userId, section, score, total, correct, details, durationSeconds } = parsed.data;

  // ── Vérification des limites de sessions selon le plan ──────────
  const userPlan = (req.headers['x-user-plan'] as string) || 'free';

  if (!PAID_PLANS.includes(userPlan)) {
    // Gratuit : max 3 sessions par section
    const count = await prisma.result.count({ where: { userId, section } });
    if (count >= 3) {
      res.status(403).json({
        error: `Limite de 3 sessions d'essai atteinte pour la section ${section}. Passez à un plan payant pour continuer.`,
        code: 'FREE_LIMIT_REACHED',
        section,
      });
      return;
    }
  } else if (userPlan === 'bronze') {
    // Bronze : max 10 sessions toutes sections confondues
    const count = await prisma.result.count({ where: { userId } });
    if (count >= 10) {
      res.status(403).json({
        error: 'Limite de 10 sessions atteinte avec le plan Bronze. Passez à Silver pour des sessions illimitées.',
        code: 'BRONZE_LIMIT_REACHED',
      });
      return;
    }
  }
  // silver | gold | pro | annual : illimité — pas de vérification

  // Garantit que l'utilisateur existe même sans webhook Clerk configuré
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, email: '', fullName: 'Apprenant' },
    update: {},
  });

  const result = await prisma.result.create({
    data: { userId, section, score, total, correct, details, durationS: durationSeconds },
    select: { id: true, createdAt: true },
  });

  res.status(201).json({ resultId: result.id, message: 'Résultat enregistré.' });
});

// GET /progress/dashboard/:userId
router.get('/dashboard/:userId', async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.userId;

  const results = await prisma.result.findMany({
    where: { userId },
    select: { section: true, score: true, correct: true, total: true },
    orderBy: { createdAt: 'desc' },
  });

  const sections = ['CO', 'CE', 'EE', 'EO'] as const;
  const stats = sections.map(s => {
    const sr = results.filter((r: { section: string }) => r.section === s);
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
  const history = await prisma.result.findMany({
    where: { userId: req.params.userId },
    select: { id: true, section: true, score: true, total: true, correct: true, durationS: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ history });
});

// GET /progress/stats — public, pas d'auth
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  const [count, agg, uniq, passed] = await Promise.all([
    prisma.result.count(),
    prisma.result.aggregate({ _avg: { score: true } }),
    prisma.result.findMany({ distinct: ['userId'], select: { userId: true } }),
    prisma.result.count({ where: { score: { gte: 60 } } }),
  ]);
  const successRate = count > 0 ? Math.round((passed / count) * 100) : 0;
  res.json({
    totalUsers: uniq.length,
    totalSessions: count,
    averageScore: Math.round(agg._avg.score ?? 0),
    successRate,
  });
});

export default router;
