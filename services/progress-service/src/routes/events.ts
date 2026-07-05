import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';

const router = Router();

const eventSchema = z.object({
  userId:   z.string().optional(),
  event:    z.string().min(1).max(100),
  page:     z.string().min(1).max(200),
  section:  z.string().max(10).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// POST /events — enregistrer un événement (fire-and-forget)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { userId, event, page, section, metadata } = parsed.data;

  // Enregistrement non-bloquant
  prisma.pageEvent.create({
    data: { userId, event, page, section, metadata: (metadata ?? {}) as never },
  }).catch(() => {}); // silencieux si échec

  res.status(202).json({ ok: true });
});

export default router;
