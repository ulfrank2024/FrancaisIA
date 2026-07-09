import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { createClerkClient } from '@clerk/backend';

const router = Router();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// ── Middleware : vérifie que c'est bien l'admin ───────────────────
function requireAdmin(req: Request, res: Response, next: () => void): void {
  const userId = req.headers['x-user-id'] as string;
  const adminId = process.env.ADMIN_USER_ID;
  if (!adminId || userId !== adminId) {
    res.status(403).json({ error: 'Accès réservé à l\'administrateur.' });
    return;
  }
  next();
}

router.use(requireAdmin);

// ── Statistiques globales ─────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  const [
    totalResults,
    pendingRequests,
    approvedProfs,
    totalClasses,
    subscriptions,
    recentSessions,
    sessionsBySection,
    avgScores,
    clerkUsers,
  ] = await Promise.all([
    prisma.result.count(),
    prisma.professorRequest.count({ where: { status: 'pending' } }),
    prisma.professorRequest.count({ where: { status: 'approved' } }),
    prisma.class.count(),
    prisma.subscription.groupBy({ by: ['plan'], _count: true }),
    prisma.result.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { userId: true, section: true, score: true, correct: true, total: true, durationS: true, createdAt: true } }),
    prisma.result.groupBy({ by: ['section'], _count: true }),
    prisma.result.groupBy({ by: ['section'], _avg: { score: true } }),
    clerk.users.getCount(),
  ]);

  res.json({
    totalUsers: clerkUsers,
    totalSessions: totalResults,
    pendingProfRequests: pendingRequests,
    approvedProfessors: approvedProfs,
    totalClasses,
    subscriptions: Object.fromEntries(subscriptions.map((s: { plan: string; _count: number }) => [s.plan, s._count])),
    recentSessions,
    sessionsBySection: Object.fromEntries(sessionsBySection.map((s: { section: string; _count: number }) => [s.section, s._count])),
    avgScoresBySection: Object.fromEntries(avgScores.map((s: { section: string; _avg: { score: number | null } }) => [s.section, Math.round(s._avg.score ?? 0)])),
  });
});

// ── Demandes professeur ───────────────────────────────────────────

// GET /admin/prof-requests?status=pending
router.get('/prof-requests', async (req: Request, res: Response): Promise<void> => {
  const status = req.query.status as string | undefined;
  const requests = await prisma.professorRequest.findMany({
    where: status ? { status: status as 'pending' | 'approved' | 'rejected' } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ requests });
});

// POST /admin/prof-requests — admin crée une demande pré-approuvée (invitation directe)
const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  message: z.string().optional(),
});

router.post('/prof-requests', async (req: Request, res: Response): Promise<void> => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { email, fullName, message } = parsed.data;

  // Chercher si l'utilisateur a déjà un compte Clerk
  const clerkUsers = await clerk.users.getUserList({ emailAddress: [email] });
  const existingUser = clerkUsers.data[0];

  if (existingUser) {
    // Mettre à jour directement ses metadata
    await clerk.users.updateUser(existingUser.id, {
      unsafeMetadata: { ...existingUser.unsafeMetadata, role: 'professeur', completedOnboarding: true },
    });
    // Créer la demande comme déjà approuvée
    const req_ = await prisma.professorRequest.upsert({
      where: { userId: existingUser.id },
      create: { userId: existingUser.id, email, fullName, message, status: 'approved', reviewedBy: 'admin', reviewedAt: new Date() },
      update: { status: 'approved', reviewedBy: 'admin', reviewedAt: new Date() },
    });
    res.json({ request: req_, directlyApproved: true, message: 'Utilisateur trouvé et promu professeur directement.' });
  } else {
    // Créer une invitation (l'utilisateur n'a pas encore de compte)
    const invitation = await prisma.professorInvitation.upsert({
      where: { email },
      create: { email, invitedBy: req.headers['x-user-id'] as string },
      update: { invitedBy: req.headers['x-user-id'] as string, usedAt: null },
    });
    res.json({ invitation, directlyApproved: false, message: 'Invitation créée. L\'utilisateur sera auto-approuvé à l\'inscription.' });
  }
});

// PATCH /admin/prof-requests/:id/approve
router.patch('/prof-requests/:id/approve', async (req: Request, res: Response): Promise<void> => {
  const request = await prisma.professorRequest.update({
    where: { id: req.params.id },
    data: { status: 'approved', reviewedBy: req.headers['x-user-id'] as string, reviewedAt: new Date() },
  });

  // Mettre à jour les metadata Clerk de l'utilisateur
  try {
    const clerkUser = await clerk.users.getUser(request.userId);
    await clerk.users.updateUser(request.userId, {
      unsafeMetadata: { ...clerkUser.unsafeMetadata, role: 'professeur', completedOnboarding: true },
    });
  } catch (e) {
    console.error('Clerk update failed:', e);
  }

  res.json({ request, message: 'Professeur approuvé et notifié.' });
});

// PATCH /admin/prof-requests/:id/reject
const rejectSchema = z.object({ reason: z.string().optional() });

router.patch('/prof-requests/:id/reject', async (req: Request, res: Response): Promise<void> => {
  const { reason } = rejectSchema.parse(req.body);
  const request = await prisma.professorRequest.update({
    where: { id: req.params.id },
    data: {
      status: 'rejected',
      reviewedBy: req.headers['x-user-id'] as string,
      reviewedAt: new Date(),
      message: reason ?? undefined,
    },
  });
  res.json({ request });
});

// ── Professeurs approuvés + leurs classes ─────────────────────────
router.get('/professors', async (_req: Request, res: Response): Promise<void> => {
  const approved = await prisma.professorRequest.findMany({
    where: { status: 'approved' },
    orderBy: { reviewedAt: 'desc' },
  });

  const withClasses = await Promise.all(approved.map(async (p: typeof approved[number]) => {
    const classes = await prisma.class.findMany({
      where: { professorId: p.userId },
      include: { _count: { select: { members: true, submissions: true } } },
    });
    return { ...p, classes };
  }));

  res.json({ professors: withClasses });
});

// ── Abonnements ───────────────────────────────────────────────────
router.get('/subscriptions', async (_req: Request, res: Response): Promise<void> => {
  const subs = await prisma.subscription.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ subscriptions: subs });
});

router.post('/subscriptions', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    userId: z.string(), email: z.string().email(),
    plan: z.enum(['free', 'bronze', 'silver', 'gold', 'pro', 'annual']),
    expiresAt: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { userId, email, plan, expiresAt } = parsed.data;

  const sub = await prisma.subscription.upsert({
    where: { userId },
    create: { userId, email, plan, status: 'active', expiresAt: expiresAt ? new Date(expiresAt) : undefined },
    update: { plan, status: 'active', expiresAt: expiresAt ? new Date(expiresAt) : null },
  });

  // Synchroniser le plan dans les metadata Clerk pour que le client voit le changement immédiatement
  try {
    const clerkUser = await clerk.users.getUser(userId);
    await clerk.users.updateUser(userId, {
      unsafeMetadata: { ...clerkUser.unsafeMetadata, plan },
    });
  } catch (e) {
    console.error('[subscriptions] Clerk metadata sync failed:', e);
  }

  res.json(sub);
});

// DELETE /admin/subscriptions/:userId — révoquer l'accès
router.delete('/subscriptions/:userId', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  await prisma.subscription.updateMany({
    where: { userId },
    data: { plan: 'free', status: 'cancelled' },
  });
  try {
    const clerkUser = await clerk.users.getUser(userId);
    await clerk.users.updateUser(userId, {
      unsafeMetadata: { ...clerkUser.unsafeMetadata, plan: 'free' },
    });
  } catch (e) {
    console.error('[subscriptions] Clerk revoke failed:', e);
  }
  res.json({ ok: true });
});

// ── Tous les utilisateurs (via Clerk) ─────────────────────────────
router.get('/users', async (_req: Request, res: Response): Promise<void> => {
  const { data: users } = await clerk.users.getUserList({ limit: 100, orderBy: '-created_at' });
  const subs = await prisma.subscription.findMany({ select: { userId: true, plan: true } });
  const subMap = Object.fromEntries(subs.map((s: { userId: string; plan: string }) => [s.userId, s.plan]));

  res.json({
    users: users.map(u => ({
      id: u.id,
      email: u.emailAddresses[0]?.emailAddress,
      fullName: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      role: (u.unsafeMetadata as Record<string, string>)?.role ?? 'apprenant',
      createdAt: u.createdAt,
      plan: subMap[u.id] ?? 'free',
    })),
  });
});

// ── Sondages ──────────────────────────────────────────────────────
router.get('/surveys', async (_req: Request, res: Response): Promise<void> => {
  const [surveys, stats] = await Promise.all([
    prisma.survey.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.survey.groupBy({
      by: ['section'],
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  const globalAvg = surveys.length
    ? surveys.reduce((sum: number, x: { rating: number }) => sum + x.rating, 0) / surveys.length
    : null;

  const dist = [1, 2, 3, 4, 5].map(r => ({
    rating: r,
    count: surveys.filter((s: { rating: number }) => s.rating === r).length,
  }));

  res.json({ surveys, stats, globalAvg, dist, total: surveys.length });
});

// ── Flux d'utilisation ────────────────────────────────────────────
router.get('/flux', async (req: Request, res: Response): Promise<void> => {
  const days = Number((req as Request & { query: Record<string, string> }).query.days) || 30;
  const since = new Date(Date.now() - days * 86_400_000);

  const [
    topPages,
    topEvents,
    dailyEvents,
    sectionUsage,
    totalEvents,
    uniqueUsers,
  ] = await Promise.all([
    // Pages les plus visitées
    prisma.pageEvent.groupBy({
      by: ['page'],
      _count: true,
      where: { event: 'page_view', createdAt: { gte: since } },
      orderBy: { _count: { page: 'desc' } },
      take: 15,
    }),
    // Événements les plus fréquents
    prisma.pageEvent.groupBy({
      by: ['event'],
      _count: true,
      where: { createdAt: { gte: since } },
      orderBy: { _count: { event: 'desc' } },
      take: 10,
    }),
    // Événements par jour (30 derniers)
    prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*)::int as count
      FROM "PageEvent"
      WHERE "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
    // Usage par section (sessions démarrées)
    prisma.pageEvent.groupBy({
      by: ['section'],
      _count: true,
      where: { event: 'session_start', section: { not: null }, createdAt: { gte: since } },
      orderBy: { _count: { section: 'desc' } },
    }),
    // Total événements
    prisma.pageEvent.count({ where: { createdAt: { gte: since } } }),
    // Utilisateurs uniques actifs
    prisma.pageEvent.findMany({
      where: { userId: { not: null }, createdAt: { gte: since } },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ]);

  // Funnel de conversion depuis les résultats existants
  const [totalSessions, totalCompleted] = await Promise.all([
    prisma.pageEvent.count({ where: { event: 'session_start', createdAt: { gte: since } } }),
    prisma.pageEvent.count({ where: { event: 'session_complete', createdAt: { gte: since } } }),
  ]);

  res.json({
    topPages,
    topEvents,
    dailyEvents,
    sectionUsage,
    totalEvents,
    uniqueUsers: uniqueUsers.length,
    funnel: {
      sessions_started: totalSessions,
      sessions_completed: totalCompleted,
      completion_rate: totalSessions > 0 ? Math.round((totalCompleted / totalSessions) * 100) : 0,
    },
  });
});

// ── Révoquer accès prof ───────────────────────────────────────────
router.patch('/professors/:userId/revoke', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  await prisma.professorRequest.updateMany({
    where: { userId },
    data: { status: 'rejected' },
  });
  try {
    const clerkUser = await clerk.users.getUser(userId);
    await clerk.users.updateUser(userId, {
      unsafeMetadata: { ...clerkUser.unsafeMetadata, role: 'apprenant' },
    });
  } catch {}
  res.json({ ok: true });
});

export default router;
