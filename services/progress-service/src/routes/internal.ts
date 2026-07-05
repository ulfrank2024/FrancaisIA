import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

// POST /internal/subscription — appelé par le gateway après un paiement Stripe réussi
// Protégé par x-internal-key (jamais exposé via le gateway public)
router.post('/subscription', async (req: Request, res: Response): Promise<void> => {
  const key = req.headers['x-internal-key'];
  if (!process.env.INTERNAL_SECRET || key !== process.env.INTERNAL_SECRET) {
    res.status(403).json({ error: 'Accès interdit.' });
    return;
  }

  const { userId, email, plan, stripeCustomerId, stripeSessionId } = req.body as {
    userId: string;
    email: string;
    plan: string;
    stripeCustomerId?: string;
    stripeSessionId?: string;
  };

  if (!userId || !plan) {
    res.status(400).json({ error: 'userId et plan requis.' });
    return;
  }

  try {
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: plan as never,
        email,
        status: 'active' as never,
        startedAt: new Date(),
        expiresAt: null,
      },
      create: {
        userId,
        email: email || '',
        plan: plan as never,
        status: 'active' as never,
      },
    });

    console.log(`[internal] Subscription upserted: userId=${userId} plan=${plan} stripe_session=${stripeSessionId ?? 'n/a'} customer=${stripeCustomerId ?? 'n/a'}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[internal] Erreur upsert subscription:', err);
    res.status(500).json({ error: 'Erreur base de données.' });
  }
});

export default router;
