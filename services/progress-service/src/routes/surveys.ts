import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';

const router = Router();

const surveySchema = z.object({
  userId:   z.string().min(1),
  section:  z.string().min(1),
  resultId: z.string().optional(),
  rating:   z.number().int().min(1).max(5),
  comment:  z.string().max(500).optional(),
});

// POST /surveys — soumettre un sondage
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = surveySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { userId, section, resultId, rating, comment } = parsed.data;

  // Un seul sondage par resultId
  if (resultId) {
    const existing = await prisma.survey.findFirst({ where: { resultId } });
    if (existing) {
      res.status(409).json({ error: 'Sondage déjà soumis pour cette session.' });
      return;
    }
  }

  const survey = await prisma.survey.create({
    data: { userId, section, resultId, rating, comment },
    select: { id: true, rating: true, createdAt: true },
  });

  res.status(201).json(survey);
});

export default router;
