import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
type SubmissionStatus = 'pending' | 'corrected';

const router = Router();

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ── Classes ───────────────────────────────────────────────────────

// POST /classes — prof crée une classe
const createClassSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  professorId: z.string().min(1),
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = createClassSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { name, description, professorId } = parsed.data;
  let inviteCode = randomCode();
  let attempts = 0;
  while (await prisma.class.findUnique({ where: { inviteCode } }) && attempts++ < 5) {
    inviteCode = randomCode();
  }
  const cls = await prisma.class.create({ data: { name, description, professorId, inviteCode } });
  res.status(201).json(cls);
});

// GET /classes/prof/:professorId — toutes les classes d'un prof
router.get('/prof/:professorId', async (req: Request, res: Response): Promise<void> => {
  const classes = await prisma.class.findMany({
    where: { professorId: req.params.professorId },
    include: {
      members: { select: { studentId: true, joinedAt: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ classes });
});

// GET /classes/:id — détails d'une classe + membres + progression
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const cls = await prisma.class.findUnique({
    where: { id: req.params.id },
    include: { members: { select: { studentId: true, joinedAt: true } } },
  });
  if (!cls) { res.status(404).json({ error: 'Classe introuvable.' }); return; }

  const studentIds = cls.members.map((m: { studentId: string }) => m.studentId);
  const results = await prisma.result.findMany({
    where: { userId: { in: studentIds } },
    select: { userId: true, section: true, score: true, createdAt: true },
  });

  const sections = ['CO', 'CE', 'EE', 'EO'] as const;
  const studentStats = studentIds.map((sid: string) => {
    const sr = results.filter((r: { userId: string }) => r.userId === sid);
    const stats = sections.map(s => {
      const ss = sr.filter((r: { section: string }) => r.section === s);
      return { section: s, averageScore: ss.length ? Math.round(ss.reduce((a: number, b: { score: number }) => a + b.score, 0) / ss.length) : null, attempts: ss.length };
    });
    const global = sr.length ? Math.round(sr.reduce((a: number, b: { score: number }) => a + b.score, 0) / sr.length) : null;
    const joined = cls.members.find((m: { studentId: string }) => m.studentId === sid)?.joinedAt;
    return { studentId: sid, globalAverage: global, totalAttempts: sr.length, stats, joinedAt: joined };
  });

  res.json({ ...cls, studentStats });
});

// DELETE /classes/:id — supprimer une classe
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  await prisma.class.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

// ── Membres ───────────────────────────────────────────────────────

// POST /classes/join — apprenant rejoint avec un code
const joinSchema = z.object({
  inviteCode: z.string().min(1),
  studentId: z.string().min(1),
});

router.post('/join', async (req: Request, res: Response): Promise<void> => {
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { inviteCode, studentId } = parsed.data;

  const cls = await prisma.class.findUnique({ where: { inviteCode: inviteCode.toUpperCase() } });
  if (!cls) { res.status(404).json({ error: 'Code invalide. Vérifie le code fourni par ton professeur.' }); return; }

  const membership = await prisma.classMembership.upsert({
    where: { classId_studentId: { classId: cls.id, studentId } },
    create: { classId: cls.id, studentId },
    update: {},
  });

  res.status(201).json({ class: cls, membership });
});

// GET /classes/student/:studentId — classes d'un apprenant
router.get('/student/:studentId', async (req: Request, res: Response): Promise<void> => {
  const memberships = await prisma.classMembership.findMany({
    where: { studentId: req.params.studentId },
    include: { class: { select: { id: true, name: true, description: true, professorId: true, inviteCode: true } } },
  });
  res.json({ classes: memberships.map((m: { class: object; joinedAt: Date }) => ({ ...m.class, joinedAt: m.joinedAt })) });
});

// ── Soumissions EE/EO ─────────────────────────────────────────────

const submitSchema = z.object({
  studentId: z.string().min(1),
  classId: z.string().optional(),
  section: z.enum(['EE', 'EO']),
  question: z.string().min(1),
  answer: z.string().min(1),
});

// POST /classes/submissions — apprenant soumet un exercice
router.post('/submissions', async (req: Request, res: Response): Promise<void> => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const sub = await prisma.exerciseSubmission.create({ data: parsed.data });
  res.status(201).json(sub);
});

// GET /classes/submissions/prof/:professorId — soumissions en attente pour un prof
router.get('/submissions/prof/:professorId', async (req: Request, res: Response): Promise<void> => {
  const { status } = req.query;
  const classes = await prisma.class.findMany({
    where: { professorId: req.params.professorId },
    select: { id: true, name: true },
  });
  const classIds = classes.map((c: { id: string }) => c.id);

  const subs = await prisma.exerciseSubmission.findMany({
    where: {
      classId: { in: classIds },
      ...(status ? { status: status as SubmissionStatus } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ submissions: subs.map((s: { classId?: string | null }) => ({
    ...s,
    className: classes.find((c: { id: string }) => c.id === s.classId)?.name,
  })) });
});

// GET /classes/submissions/student/:studentId — soumissions d'un apprenant
router.get('/submissions/student/:studentId', async (req: Request, res: Response): Promise<void> => {
  const subs = await prisma.exerciseSubmission.findMany({
    where: { studentId: req.params.studentId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ submissions: subs });
});

// PATCH /classes/submissions/:id/correct — prof corrige
const correctSchema = z.object({
  score: z.number().int().min(0).max(20),
  feedback: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
  correctedBy: z.string().min(1),
});

router.patch('/submissions/:id/correct', async (req: Request, res: Response): Promise<void> => {
  const parsed = correctSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { score, feedback, strengths, errors, correctedBy } = parsed.data;

  const sub = await prisma.exerciseSubmission.update({
    where: { id: req.params.id },
    data: { score, feedback, strengths, errors, correctedBy, correctedAt: new Date(), status: 'corrected' },
  });
  res.json(sub);
});

// POST /classes/prof-request — apprenant demande l'accès prof (vérifie si invitation pré-approuvée)
const profRequestSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().min(1),
  message: z.string().optional(),
});

router.post('/prof-request', async (req: Request, res: Response): Promise<void> => {
  const parsed = profRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { userId, email, fullName, message } = parsed.data;

  // Vérifier si une invitation pré-approuvée existe
  const invitation = await prisma.professorInvitation.findUnique({ where: { email } });
  const autoApproved = !!invitation && !invitation.usedAt;

  if (autoApproved) {
    await prisma.professorInvitation.update({ where: { email }, data: { usedAt: new Date() } });
  }

  await prisma.professorRequest.upsert({
    where: { userId },
    create: {
      userId, email, fullName, message,
      status: autoApproved ? 'approved' : 'pending',
      reviewedBy: autoApproved ? 'auto-invite' : undefined,
      reviewedAt: autoApproved ? new Date() : undefined,
    },
    update: { email, fullName, message },
  });

  res.json({ autoApproved });
});

export default router;
