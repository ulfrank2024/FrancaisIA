import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { Section, Level, Question } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const router = Router();

const querySchema = z.object({
  section: z.nativeEnum(Section).optional(),
  level: z.nativeEnum(Level).optional(),
  limit: z.coerce.number().min(1).max(2000).default(10),
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
      orderNumber: true, points: true,
    },
    take: limit,
  });

  // CO : tri garanti par orderNumber (A1→C2), pas de mélange aléatoire
  const ordered = section === 'CO'
    ? [...questions].sort((a, b) => ((a as { orderNumber?: number | null }).orderNumber ?? 999) - ((b as { orderNumber?: number | null }).orderNumber ?? 999))
    : questions.sort(() => Math.random() - 0.5);
  res.json({ questions: ordered, total: ordered.length });
});

// GET /questions/session — session complète EE ou EO (3 tâches)
router.get('/session', async (req: Request, res: Response): Promise<void> => {
  const parsed = sessionQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { section, level } = parsed.data;

  // ── Session EO : assemblage dynamique — Tâche 1 fixe, Tâches 2 et 3 aléatoires ──
  if (section === 'EO') {
    const lvlFilter = level ? { level } : {};

    const pickRandom = (pool: { id: string }[]) =>
      pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)].id : null;

    // Tirer les IDs depuis chaque banque indépendamment
    const [pool1, pool2, pool3] = await Promise.all([
      prisma.question.findMany({ where: { active: true, section: 'EO', taskNumber: 1, ...lvlFilter }, select: { id: true } }),
      prisma.question.findMany({ where: { active: true, section: 'EO', taskNumber: 2, ...lvlFilter }, select: { id: true } }),
      prisma.question.findMany({ where: { active: true, section: 'EO', taskNumber: 3, ...lvlFilter }, select: { id: true } }),
    ]);

    const [id1, id2, id3] = [pickRandom(pool1), pickRandom(pool2), pickRandom(pool3)];

    const [raw1, raw2, raw3] = await Promise.all([
      id1 ? prisma.question.findUnique({ where: { id: id1 } }) : Promise.resolve(null),
      id2 ? prisma.question.findUnique({ where: { id: id2 } }) : Promise.resolve(null),
      id3 ? prisma.question.findUnique({ where: { id: id3 } }) : Promise.resolve(null),
    ]);

    let task1 = raw1, task2 = raw2, task3 = raw3;

    // Tâche 1 hardcodée en fallback si absente de la DB
    if (!task1) {
      const fallback: Question = {
        id: 'eo-task1-default',
        section: 'EO' as Section,
        level: 'B1' as Level,
        question: "L'examinateur vous demande de vous présenter : parlez de vous, de votre parcours, de votre famille, de vos loisirs et de votre projet au Canada.",
        theme: 'présentation',
        taskNumber: 1,
        sessionGroup: null,
        options: null,
        answer: null,
        explanation: null,
        audioUrl: null,
        transcript: null,
        tags: [],
        imageUrl: null,
        timeLimitMin: 2,
        wordCountMin: null,
        wordCountMax: null,
        points: null,
        orderNumber: null,
        active: true,
        createdAt: new Date(),
      };
      task1 = fallback;
    }

    // Fallback IA pour Tâche 2 et Tâche 3 si banque vide
    if (!task2 || !task3) {
      const AI_URL = process.env.AI_URL ?? 'http://localhost:4003';
      const usedThemes: string[] = [];

      const generateTask = async (taskNumber: 2 | 3) => {
        try {
          const r = await fetch(`${AI_URL}/ai/generate-eo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskNumber, usedThemes }),
          });
          if (!r.ok) return null;
          const data = await r.json() as { question: string; theme: string; relances?: string };
          // Sauvegarder en DB pour enrichir la banque
          return await prisma.question.create({
            data: {
              section: 'EO',
              level: level ?? 'B1',
              question: data.question,
              theme: data.theme,
              taskNumber,
              explanation: data.relances ?? null,
              active: true,
              tags: ['ai-generated'],
            },
          });
        } catch (err) {
          console.error(`[session/EO] AI generation task${taskNumber} failed:`, err);
          return null;
        }
      };

      if (!task2) task2 = await generateTask(2);
      if (!task3) task3 = await generateTask(3);
    }

    const tasks = [task1, task2, task3].filter(Boolean);

    if (tasks.length === 0) {
      res.status(404).json({ error: 'Aucune question EO disponible.' });
      return;
    }

    res.json({
      session: {
        group: 'EO-dynamic',
        level: level ?? task2?.level ?? 'B1',
        theme: task3?.theme ?? task2?.theme ?? null,
        tasks,
      },
    });
    return;
  }

  // ── Session EE : logique inchangée par sessionGroup ──
  const groups = await prisma.question.findMany({
    where: {
      active: true,
      section,
      sessionGroup: { not: null },
      taskNumber: 1,
      ...(level && { level }),
    },
    select: { sessionGroup: true, level: true, theme: true },
  });

  if (groups.length === 0) {
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

// ── Admin : vérification admin ────────────────────────────────────
function requireAdmin(req: Request, res: Response, next: () => void): void {
  const userId = req.headers['x-user-id'] as string;
  const adminId = process.env.ADMIN_USER_ID;
  if (!adminId || userId !== adminId) {
    res.status(403).json({ error: 'Accès réservé à l\'administrateur.' });
    return;
  }
  next();
}

// ── Schémas admin ─────────────────────────────────────────────────
const bankListSchema = z.object({
  section: z.nativeEnum(Section).optional(),
  level: z.nativeEnum(Level).optional(),
  limit: z.coerce.number().min(1).max(2000).default(500),
});

const bankCreateSchema = z.object({
  section: z.nativeEnum(Section),
  level: z.nativeEnum(Level),
  question: z.string().min(5),
  options: z.record(z.string(), z.string()).optional(),
  answer: z.string().optional(),
  explanation: z.string().optional(),
  theme: z.string().optional(),
  transcript: z.string().optional(),
  tags: z.array(z.string()).optional(),
  active: z.boolean().optional().default(false),
});

const bankUpdateSchema = bankCreateSchema.partial();

// GET /questions/tasks?section=EO — banque des épreuves par tâche (utilisateurs authentifiés)
router.get('/tasks', async (req: Request, res: Response): Promise<void> => {
  const section = (req.query.section as string | undefined)?.toUpperCase();
  if (!section) { res.status(400).json({ error: 'section requis' }); return; }

  const questions = await prisma.question.findMany({
    where: { active: true, section: section as 'EO' | 'EE', taskNumber: { not: null } },
    select: { id: true, taskNumber: true, question: true, theme: true, timeLimitMin: true, tags: true, level: true },
    orderBy: [{ taskNumber: 'asc' }, { createdAt: 'asc' }],
  });

  const grouped: Record<number, typeof questions> = {};
  for (const q of questions) {
    const t = q.taskNumber!;
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(q);
  }

  res.json({ tasks: grouped, total: questions.length });
});

// GET /questions/admin/bank — liste toutes les questions (sans filtre active)
router.get('/admin/bank', requireAdmin as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
  const parsed = bankListSchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { section, level, limit } = parsed.data;

  const questions = await prisma.question.findMany({
    where: {
      ...(section && { section }),
      ...(level && { level }),
      taskNumber: null,
    },
    orderBy: [{ sessionGroup: 'asc' }, { orderNumber: 'asc' }],
    take: limit,
  });
  res.json({ questions, total: questions.length });
});

// POST /questions/admin/bank — créer une question
router.post('/admin/bank', requireAdmin as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
  const parsed = bankCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const question = await prisma.question.create({
    data: {
      ...parsed.data,
      active: parsed.data.active ?? false,
      tags: parsed.data.tags ?? [],
    },
  });
  res.status(201).json({ question });
});

// PUT /questions/admin/bank/:id — modifier une question
router.put('/admin/bank/:id', requireAdmin as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
  const parsed = bankUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const existing = await prisma.question.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: 'Question introuvable.' }); return; }

  const question = await prisma.question.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json({ question });
});

// DELETE /questions/admin/bank/:id — supprimer une question
router.delete('/admin/bank/:id', requireAdmin as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
  const existing = await prisma.question.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: 'Question introuvable.' }); return; }

  await prisma.question.delete({ where: { id: req.params.id } });
  res.json({ ok: true, id: req.params.id });
});

// ── Admin : Sessions EO/EE (CRUD) ────────────────────────────────
const sessionAdminListSchema = z.object({
  section: z.enum(['EE', 'EO']).optional(),
  level: z.nativeEnum(Level).optional(),
  limit: z.coerce.number().min(1).max(2000).default(500),
});

const sessionAdminCreateSchema = z.object({
  section: z.enum(['EE', 'EO']),
  level: z.nativeEnum(Level).optional().default('B1'), // EO n'a pas de niveau évalué
  question: z.string().min(5),
  explanation: z.string().optional(),
  theme: z.string().optional(),
  taskNumber: z.coerce.number().int().min(1).max(3),
  sessionGroup: z.string().min(1).max(20),
  timeLimitMin: z.coerce.number().int().min(1).max(10).optional(),
  active: z.boolean().optional().default(false),
});

const sessionAdminUpdateSchema = sessionAdminCreateSchema.partial();

// GET /questions/admin/sessions — liste les tâches EO/EE
router.get('/admin/sessions', requireAdmin as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
  const parsed = sessionAdminListSchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { section, level, limit } = parsed.data;

  const sessions = await prisma.question.findMany({
    where: {
      taskNumber: { not: null },
      ...(section && { section }),
      ...(level && { level }),
    },
    orderBy: [{ sessionGroup: 'asc' }, { taskNumber: 'asc' }],
    take: limit,
  });
  res.json({ sessions, total: sessions.length });
});

// POST /questions/admin/sessions — créer une tâche
router.post('/admin/sessions', requireAdmin as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
  const parsed = sessionAdminCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const session = await prisma.question.create({
    data: {
      ...parsed.data,
      active: parsed.data.active ?? false,
      tags: [],
    },
  });
  res.status(201).json({ session });
});

// PUT /questions/admin/sessions/:id — modifier une tâche
router.put('/admin/sessions/:id', requireAdmin as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
  const parsed = sessionAdminUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const existing = await prisma.question.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: 'Tâche introuvable.' }); return; }

  const session = await prisma.question.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ session });
});

// DELETE /questions/admin/sessions/:id — supprimer une tâche
router.delete('/admin/sessions/:id', requireAdmin as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
  const existing = await prisma.question.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: 'Tâche introuvable.' }); return; }

  await prisma.question.delete({ where: { id: req.params.id } });
  res.json({ ok: true, id: req.params.id });
});

// ── Séries d'épreuves générées par l'admin ───────────────────────

const examSeriesSaveSchema = z.object({
  section: z.enum(['EE', 'CE', 'EO', 'CO']),
  series:  z.array(z.any()).min(1).max(100),
});

// POST /questions/admin/exam-series — sauvegarder les séries générées
router.post('/admin/exam-series', requireAdmin as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
  const parsed = examSeriesSaveSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { section, series } = parsed.data;

  const config = await db.examSeriesConfig.upsert({
    where:  { section },
    create: { section, series, savedAt: new Date() },
    update: { series, savedAt: new Date() },
  });
  res.json({ ok: true, config });
});

// GET /questions/admin/exam-series?section=EE — lire la config sauvegardée (admin)
router.get('/admin/exam-series', requireAdmin as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
  const section = (req.query.section as string | undefined)?.toUpperCase();
  if (!section || !['EE', 'CE', 'EO', 'CO'].includes(section)) {
    res.status(400).json({ error: 'section doit être EE, CE, EO ou CO' }); return;
  }

  if (section === 'CO') {
    const saved = await db.examSeriesConfig.findUnique({ where: { section: 'CO' } });
    if (saved) { res.json({ config: saved }); return; }
    res.json({ config: null });
    return;
  }

  const config = await db.examSeriesConfig.findUnique({ where: { section } });
  res.json({ config: config || null });
});

// GET /questions/exam-series?section=EE — séries actives pour les clients (résolution IDs)
router.get('/exam-series', async (req: Request, res: Response): Promise<void> => {
  const section = (req.query.section as string | undefined)?.toUpperCase();
  if (!section || !['EE', 'CE', 'EO', 'CO'].includes(section)) {
    res.status(400).json({ error: 'section doit être EE, CE, EO ou CO' }); return;
  }

  if (section === 'CO') {
    const coConfig = await db.examSeriesConfig.findUnique({ where: { section: 'CO' } });
    if (!coConfig) { res.json({ section: 'CO', series: [], savedAt: null }); return; }
    const seriesData = coConfig.series as { id: number; questionIds: string[] }[];
    const allIds = new Set<string>();
    seriesData.forEach(s => s.questionIds.forEach(id => allIds.add(id)));
    const questions = await prisma.question.findMany({
      where: { id: { in: [...allIds] } },
      select: { id: true, section: true, level: true, question: true, options: true, answer: true,
                explanation: true, audioUrl: true, transcript: true, theme: true, imageUrl: true,
                timeLimitMin: true, orderNumber: true, points: true, sessionGroup: true },
    });
    const qMap = Object.fromEntries(questions.map(q => [q.id, q]));
    const resolved = seriesData
      .map(s => ({ id: s.id, sessionGroup: '', questions: s.questionIds.map(id => qMap[id]).filter(Boolean) }))
      .filter(s => s.questions.length > 0);
    res.json({ section: 'CO', series: resolved, savedAt: coConfig.savedAt });
    return;
  }

  const config = await db.examSeriesConfig.findUnique({ where: { section } });
  if (!config) { res.json({ section, series: [], savedAt: null }); return; }

  const seriesData = config.series as any[];

  if (section === 'EE' || section === 'EO') {
    const allIds = new Set<string>();
    seriesData.forEach((s: any) => { allIds.add(s.t1Id); allIds.add(s.t2Id); allIds.add(s.t3Id); });
    const questions = await prisma.question.findMany({
      where: { id: { in: [...allIds] } },
      select: { id: true, question: true, taskNumber: true, theme: true,
                timeLimitMin: true, wordCountMin: true, wordCountMax: true,
                sessionGroup: true, level: true },
    });
    const qMap = Object.fromEntries(questions.map(q => [q.id, q]));
    const resolved = seriesData
      .map((s: any) => ({ id: s.id, t1: qMap[s.t1Id], t2: qMap[s.t2Id], t3: qMap[s.t3Id] }))
      .filter((s: any) => s.t1 && s.t2 && s.t3);
    res.json({ section, series: resolved, savedAt: config.savedAt });
    return;
  }

  // CE
  const allIds = new Set<string>();
  seriesData.forEach((s: any) => (s.questionIds as string[]).forEach((id: string) => allIds.add(id)));
  const questions = await prisma.question.findMany({
    where: { id: { in: [...allIds] } },
    select: { id: true, question: true, level: true, options: true, answer: true,
              explanation: true, theme: true },
  });
  const qMap = Object.fromEntries(questions.map(q => [q.id, q]));
  const resolved = seriesData
    .map((s: any) => ({
      id: s.id,
      questions: (s.questionIds as string[]).map((id: string) => qMap[id]).filter(Boolean),
    }))
    .filter((s: any) => s.questions.length > 0);
  res.json({ section, series: resolved, savedAt: config.savedAt });
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
