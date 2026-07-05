import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';

const router = Router();

const lessonSchema = z.object({
  professorId: z.string().min(1),
  title: z.string().min(1).max(200),
  section: z.enum(['CO', 'CE', 'EE', 'EO']),
  content: z.string().min(1),
});

// POST /lessons — créer un cours
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = lessonSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const lesson = await prisma.lesson.create({ data: parsed.data });
  res.status(201).json({ lesson });
});

// GET /lessons/prof/:professorId — tous les cours d'un prof
router.get('/prof/:professorId', async (req: Request, res: Response): Promise<void> => {
  const lessons = await prisma.lesson.findMany({
    where: { professorId: req.params.professorId },
    include: { assignments: { select: { studentId: true, classId: true, assignedAt: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ lessons });
});

// GET /lessons/student/:studentId — cours assignés à un étudiant
router.get('/student/:studentId', async (req: Request, res: Response): Promise<void> => {
  const assignments = await prisma.lessonAssignment.findMany({
    where: { studentId: req.params.studentId },
    include: { lesson: true },
    orderBy: { assignedAt: 'desc' },
  });
  res.json({ lessons: assignments.map((a: { lesson: object; assignedAt: Date; classId: string }) => ({ ...a.lesson, assignedAt: a.assignedAt, classId: a.classId })) });
});

// GET /lessons/:id — détail d'un cours
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.id },
    include: { assignments: { select: { studentId: true, classId: true, assignedAt: true } } },
  });
  if (!lesson) { res.status(404).json({ error: 'Cours introuvable.' }); return; }
  res.json({ lesson });
});

// PATCH /lessons/:id — modifier un cours
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    title: z.string().min(1).max(200).optional(),
    section: z.enum(['CO', 'CE', 'EE', 'EO']).optional(),
    content: z.string().min(1).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const lesson = await prisma.lesson.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ lesson });
});

// DELETE /lessons/:id — supprimer un cours
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  await prisma.lesson.delete({ where: { id: req.params.id } }).catch(() => null);
  res.json({ ok: true });
});

// POST /lessons/:id/assign — assigner à des étudiants
router.post('/:id/assign', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    assignments: z.array(z.object({ studentId: z.string(), classId: z.string() })).min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const { assignments } = parsed.data;
  const lessonId = req.params.id;

  for (const a of assignments as { studentId: string; classId: string }[]) {
    await prisma.lessonAssignment.upsert({
      where: { lessonId_studentId: { lessonId, studentId: a.studentId } },
      create: { lessonId, studentId: a.studentId, classId: a.classId },
      update: { classId: a.classId },
    });
  }

  const updated = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { assignments: { select: { studentId: true, classId: true, assignedAt: true } } },
  });
  res.json({ lesson: updated });
});

// DELETE /lessons/:id/assign/:studentId — désassigner
router.delete('/:id/assign/:studentId', async (req: Request, res: Response): Promise<void> => {
  await prisma.lessonAssignment.deleteMany({
    where: { lessonId: req.params.id, studentId: req.params.studentId },
  });
  res.json({ ok: true });
});

export default router;
