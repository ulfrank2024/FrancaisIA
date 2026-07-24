import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';

const router = Router();

const INTERNAL_KEY = process.env.INTERNAL_SECRET ?? '';
const PLAN_PRICES: Record<string, number> = {
  bronze: 14.99,
  silver: 29.99,
  gold:   49.99 / 2,
  pro:    9.99,
  annual: 79.99 / 12,
};

function requireInternal(req: Request, res: Response, next: () => void): void {
  if (req.headers['x-internal-key'] !== INTERNAL_KEY) {
    res.status(403).json({ error: 'Accès refusé' });
    return;
  }
  next();
}

// POST /ambassadors/invite — admin crée une invitation par email
router.post('/invite', requireInternal, async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    email:         z.string().email(),
    commissionPct: z.number().min(1).max(100).default(30),
    invitedBy:     z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { email, commissionPct, invitedBy } = parsed.data;

  // Upsert — regénère le token si l'email existe déjà (réinvitation)
  const existing = await prisma.ambassadorInvitation.findUnique({ where: { email } });
  const invitation = existing
    ? await prisma.ambassadorInvitation.update({
        where: { email },
        data: { commissionPct, invitedBy, token: require('crypto').randomUUID(), usedAt: null },
      })
    : await prisma.ambassadorInvitation.create({ data: { email, commissionPct, invitedBy } });

  res.json({ invitation });
});

// GET /ambassadors/invite/:token — valider un token d'invitation
router.get('/invite/:token', async (req: Request, res: Response): Promise<void> => {
  const invitation = await prisma.ambassadorInvitation.findUnique({
    where: { token: req.params.token },
  });
  if (!invitation)         { res.status(404).json({ error: 'Invitation introuvable' }); return; }
  if (invitation.usedAt)   { res.status(410).json({ error: 'Invitation déjà utilisée' }); return; }
  res.json({ invitation: { email: invitation.email, commissionPct: invitation.commissionPct } });
});

// POST /ambassadors/invite/:token/accept — l'ambassadeur accepte l'invitation après login
router.post('/invite/:token/accept', requireInternal, async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    userId:      z.string(),
    fullName:    z.string().min(2),
    paymentInfo: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { userId, fullName, paymentInfo } = parsed.data;

  const invitation = await prisma.ambassadorInvitation.findUnique({ where: { token: req.params.token } });
  if (!invitation)       { res.status(404).json({ error: 'Invitation introuvable' }); return; }
  if (invitation.usedAt) { res.status(410).json({ error: 'Invitation déjà utilisée' }); return; }

  // Vérifie si ambassadeur déjà créé (idempotent)
  const existing = await prisma.ambassador.findUnique({ where: { userId } });
  if (existing) {
    await prisma.ambassadorInvitation.update({ where: { token: req.params.token }, data: { usedAt: new Date() } });
    res.json({ ambassador: existing, alreadyExists: true });
    return;
  }

  const genCode = fullName.replace(/\s+/g, '').slice(0, 5).toUpperCase()
    + Math.random().toString(36).slice(2, 5).toUpperCase();

  const [ambassador] = await prisma.$transaction([
    prisma.ambassador.create({
      data: {
        userId, email: invitation.email, fullName,
        code: genCode, commissionPct: invitation.commissionPct,
        paymentInfo: paymentInfo ?? null,
      },
    }),
    prisma.ambassadorInvitation.update({
      where: { token: req.params.token },
      data: { usedAt: new Date() },
    }),
  ]);

  res.json({ ambassador });
});

// GET /ambassadors/dashboard/:userId — dashboard ambassadeur
router.get('/dashboard/:userId', requireInternal, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const ambassador = await prisma.ambassador.findUnique({
    where: { userId },
    include: {
      referrals: { orderBy: { createdAt: 'desc' } },
      commissions: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!ambassador) { res.status(404).json({ error: 'Ambassadeur introuvable' }); return; }

  const totalReferrals   = ambassador.referrals.length;
  const subscribers      = ambassador.referrals.filter(r => r.status === 'subscribed').length;
  const pendingAmount    = ambassador.commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
  const paidAmount       = ambassador.commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
  const conversionRate   = totalReferrals > 0 ? Math.round((subscribers / totalReferrals) * 100) : 0;

  res.json({
    ambassador: {
      id: ambassador.id, code: ambassador.code, fullName: ambassador.fullName,
      email: ambassador.email, commissionPct: ambassador.commissionPct,
      paymentInfo: ambassador.paymentInfo, status: ambassador.status,
    },
    stats: { totalReferrals, subscribers, pendingAmount, paidAmount, conversionRate },
    referrals: ambassador.referrals,
    commissions: ambassador.commissions,
  });
});

// ── Routes internes (appelées par Stripe webhook et onboarding) ──

// POST /ambassadors/referral — enregistre un nouveau parrainage à l'inscription
router.post('/referral', requireInternal, async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    refCode:       z.string(),
    referredEmail: z.string().email(),
    referredName:  z.string().optional(),
    referredUserId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { refCode, referredEmail, referredName, referredUserId } = parsed.data;

  const ambassador = await prisma.ambassador.findUnique({ where: { code: refCode.toUpperCase() } });
  if (!ambassador || ambassador.status !== 'active') { res.status(404).json({ error: 'Code ambassadeur invalide' }); return; }

  // Idempotent — ne pas créer en double
  const existing = await prisma.referral.findFirst({ where: { ambassadorId: ambassador.id, referredEmail } });
  if (existing) { res.json({ referral: existing, alreadyExists: true }); return; }

  const referral = await prisma.referral.create({
    data: { ambassadorId: ambassador.id, referredEmail, referredName, referredUserId },
  });
  res.json({ referral });
});

// POST /ambassadors/commission — crée une commission quand un filleul souscrit
router.post('/commission', requireInternal, async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    referredEmail:   z.string().email(),
    plan:            z.string(),
    stripeSessionId: z.string().optional(),
    referredUserId:  z.string().optional(),
    referredName:    z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { referredEmail, plan, stripeSessionId, referredUserId, referredName } = parsed.data;

  const referral = await prisma.referral.findFirst({
    where: { referredEmail, status: { not: 'churned' } },
    include: { ambassador: true },
  });
  if (!referral) { res.json({ ok: true, skipped: 'no_referral' }); return; }

  // Mise à jour du statut du parrainage
  await prisma.referral.update({
    where: { id: referral.id },
    data: {
      status: 'subscribed',
      plan,
      subscribedAt: new Date(),
      ...(referredUserId ? { referredUserId } : {}),
      ...(referredName   ? { referredName }   : {}),
    },
  });

  const planAmount = PLAN_PRICES[plan] ?? 0;
  const pct        = referral.ambassador.commissionPct;
  const amount     = Math.round(planAmount * (pct / 100) * 100) / 100;

  const commission = await prisma.commission.create({
    data: {
      ambassadorId:    referral.ambassadorId,
      referralId:      referral.id,
      amount,
      planAmount,
      pct,
      plan,
      stripeSessionId: stripeSessionId ?? null,
      status:          'pending',
    },
  });

  res.json({ commission });
});

// PATCH /ambassadors/profile/:userId — l'ambassadeur met à jour ses infos de paiement
router.patch('/profile/:userId', requireInternal, async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    paymentInfo: z.string().email().max(200),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const ambassador = await prisma.ambassador.findUnique({ where: { userId: req.params.userId } });
  if (!ambassador) { res.status(404).json({ error: 'Ambassadeur introuvable' }); return; }

  const updated = await prisma.ambassador.update({
    where: { userId: req.params.userId },
    data: { paymentInfo: parsed.data.paymentInfo },
  });
  res.json({ ambassador: updated });
});

// ── Routes admin ─────────────────────────────────────────────────

// GET /ambassadors — liste tous les ambassadeurs
router.get('/', requireInternal, async (_req: Request, res: Response): Promise<void> => {
  const ambassadors = await prisma.ambassador.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { referrals: true, commissions: true } },
      commissions: { select: { amount: true, status: true } },
      referrals:   { select: { status: true } },
    },
  });

  res.json({
    ambassadors: ambassadors.map(a => ({
      ...a,
      totalReferrals:  a.referrals.length,
      subscribers:     a.referrals.filter(r => r.status === 'subscribed').length,
      pendingAmount:   a.commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0),
      paidAmount:      a.commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0),
      referrals:       undefined,
      commissions:     undefined,
    })),
  });
});

// POST /ambassadors — créer un ambassadeur
router.post('/', requireInternal, async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    userId:        z.string(),
    email:         z.string().email(),
    fullName:      z.string().min(2),
    commissionPct: z.number().min(1).max(100).default(30),
    paymentInfo:   z.string().optional(),
    code:          z.string().min(3).max(20).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { userId, email, fullName, commissionPct, paymentInfo, code } = parsed.data;

  // Générer un code unique si non fourni
  const genCode = code
    ? code.toUpperCase()
    : fullName.replace(/\s+/g, '').slice(0, 5).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

  const existing = await prisma.ambassador.findFirst({ where: { OR: [{ userId }, { code: genCode }] } });
  if (existing) { res.status(409).json({ error: 'Ambassadeur ou code déjà existant' }); return; }

  const ambassador = await prisma.ambassador.create({
    data: { userId, email, fullName, code: genCode, commissionPct, paymentInfo },
  });
  res.json({ ambassador });
});

// PATCH /ambassadors/:id — modifier commission / statut
router.patch('/:id', requireInternal, async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    commissionPct: z.number().min(1).max(100).optional(),
    status:        z.enum(['active', 'paused', 'inactive']).optional(),
    paymentInfo:   z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const ambassador = await prisma.ambassador.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json({ ambassador });
});

// POST /ambassadors/commissions/:id/pay — marquer comme payé
router.post('/commissions/:id/pay', requireInternal, async (req: Request, res: Response): Promise<void> => {
  const { note } = z.object({ note: z.string().optional() }).parse(req.body);
  const commission = await prisma.commission.update({
    where: { id: req.params.id },
    data: { status: 'paid', paidAt: new Date(), note: note ?? null },
  });
  res.json({ commission });
});

// POST /ambassadors/commissions/pay-all/:ambassadorId — payer toutes les commissions en attente
router.post('/commissions/pay-all/:ambassadorId', requireInternal, async (req: Request, res: Response): Promise<void> => {
  const { note } = z.object({ note: z.string().optional() }).parse(req.body);
  const result = await prisma.commission.updateMany({
    where: { ambassadorId: req.params.ambassadorId, status: 'pending' },
    data: { status: 'paid', paidAt: new Date(), note: note ?? null },
  });
  res.json({ count: result.count });
});

export default router;
