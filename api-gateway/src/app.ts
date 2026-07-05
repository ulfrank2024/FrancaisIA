import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import proxy from 'express-http-proxy';
import { verifyToken, createClerkClient } from '@clerk/backend';
import Stripe from 'stripe';
import type { IncomingHttpHeaders, IncomingMessage, ClientRequest, OutgoingHttpHeaders } from 'http';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-04-10' as any });

const planCache = new Map<string, { plan: string; expiresAt: number }>();

async function enrichPlan(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) { next(); return; }

  const cached = planCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    req.headers['x-user-plan'] = cached.plan;
    next();
    return;
  }

  try {
    const user = await clerk.users.getUser(userId);
    const plan   = (user.unsafeMetadata?.plan as string) ?? 'free';
    const subEnd = user.unsafeMetadata?.subscriptionEnd as string | undefined;

    let effectivePlan = plan;
    if (plan !== 'free' && subEnd && new Date(subEnd) < new Date()) {
      effectivePlan = 'free';
      clerk.users.updateUser(userId, {
        unsafeMetadata: { ...user.unsafeMetadata, plan: 'free' },
      }).catch(err => console.error('[Plan] Erreur rétrogradation:', err));
    }

    planCache.set(userId, { plan: effectivePlan, expiresAt: Date.now() + 5 * 60_000 });
    req.headers['x-user-plan'] = effectivePlan;
  } catch {
    req.headers['x-user-plan'] = 'free';
  }
  next();
}

const AUTH_URL     = process.env.AUTH_SERVICE_URL     || 'http://auth-service:4001';
const CONTENT_URL  = process.env.CONTENT_SERVICE_URL  || 'http://content-service:4002';
const AI_URL       = process.env.AI_SERVICE_URL       || 'http://ai-service:4003';
const PROGRESS_URL = process.env.PROGRESS_SERVICE_URL || 'http://progress-service:4004';

const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:3001')
  .split(',').map(s => s.trim());

const app = express();

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Stripe Webhook (raw body — DOIT être avant express.json)
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'] as string;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) { res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET non configuré.' }); return; }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
    } catch (err) {
      console.error('[Stripe] Signature invalide:', (err as Error).message);
      res.status(400).json({ error: 'Signature webhook invalide.' });
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;

      if (userId) {
        const plan: string | null =
          (session.metadata?.plan as string | undefined) ??
          (session.payment_link === process.env.STRIPE_PAYMENT_LINK_BRONZE ? 'bronze'
           : session.payment_link === process.env.STRIPE_PAYMENT_LINK_SILVER ? 'silver'
           : session.payment_link === process.env.STRIPE_PAYMENT_LINK_GOLD   ? 'gold'
           : null);

        if (plan) {
          try {
            await clerk.users.updateUser(userId, { unsafeMetadata: { plan } });
            planCache.delete(userId);
          } catch (err) {
            console.error('[Stripe] Erreur mise à jour Clerk:', err);
          }

          const stripeCustomer =
            typeof session.customer === 'string' ? session.customer
            : (session.customer as Stripe.Customer | null)?.id ?? null;

          fetch(`${PROGRESS_URL}/internal/subscription`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-key': process.env.INTERNAL_SECRET || '',
            },
            body: JSON.stringify({
              userId,
              email: session.customer_details?.email ?? '',
              plan,
              stripeCustomerId: stripeCustomer,
              stripeSessionId: session.id,
            }),
          }).catch(err => console.error('[Stripe] Erreur mise à jour DB:', err));
        }
      }
    }

    res.json({ received: true });
  }
);

app.use(express.json({ limit: '200kb' }));
app.use(rateLimit({
  windowMs: 15 * 60_000,
  max: process.env.NODE_ENV === 'production' ? 500 : 100_000,
  message: { error: 'Trop de requêtes, réessayez dans quelques minutes.' },
}));

async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Token manquant.' }); return; }
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    req.headers['x-user-id'] = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
}

const fixCORSHeaders = (
  headers: IncomingHttpHeaders,
  uReq: Request, _uRes: Response, _pReq: ClientRequest, _pRes: IncomingMessage
): OutgoingHttpHeaders => {
  const out: OutgoingHttpHeaders = { ...headers };
  const origin = uReq.headers['origin'] as string | undefined;
  if (origin && allowedOrigins.includes(origin)) {
    out['access-control-allow-origin'] = origin;
    out['access-control-allow-credentials'] = 'true';
  } else {
    delete out['access-control-allow-origin'];
    delete out['access-control-allow-credentials'];
  }
  delete out['access-control-allow-methods'];
  delete out['access-control-allow-headers'];
  return out;
};

app.use('/api/webhooks', proxy(AUTH_URL, {
  proxyReqPathResolver: (req) => `/webhooks${req.url}`,
}));

app.get('/api/stats', proxy(PROGRESS_URL, {
  proxyReqPathResolver: () => '/progress/stats',
  userResHeaderDecorator: fixCORSHeaders,
}));

app.use('/api/questions', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: (req) => `/questions${req.url}`,
  userResHeaderDecorator: fixCORSHeaders,
}));

app.use('/api/ai', requireAuth, enrichPlan, proxy(AI_URL, {
  proxyReqPathResolver: (req) => `/ai${req.url}`,
  userResHeaderDecorator: fixCORSHeaders,
  timeout: 60000,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers = proxyReqOpts.headers ?? {};
    (proxyReqOpts.headers as Record<string, string>)['x-user-plan'] = srcReq.headers['x-user-plan'] as string || 'free';
    return proxyReqOpts;
  },
}));

app.use('/api/progress', requireAuth, enrichPlan, proxy(PROGRESS_URL, {
  proxyReqPathResolver: (req) => `/progress${req.url}`,
  userResHeaderDecorator: fixCORSHeaders,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers = proxyReqOpts.headers ?? {};
    (proxyReqOpts.headers as Record<string, string>)['x-user-plan'] = srcReq.headers['x-user-plan'] as string || 'free';
    return proxyReqOpts;
  },
}));

app.use('/api/classes', requireAuth, proxy(PROGRESS_URL, {
  proxyReqPathResolver: (req) => `/classes${req.url}`,
  userResHeaderDecorator: fixCORSHeaders,
}));

app.use('/api/lessons', requireAuth, proxy(PROGRESS_URL, {
  proxyReqPathResolver: (req) => `/lessons${req.url}`,
  userResHeaderDecorator: fixCORSHeaders,
}));

app.get('/api/admin/questions/sessions', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: (req) => {
    const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    return `/questions/admin/sessions${qs}`;
  },
  userResHeaderDecorator: fixCORSHeaders,
}));
app.post('/api/admin/questions/sessions', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: () => '/questions/admin/sessions',
  userResHeaderDecorator: fixCORSHeaders,
}));
app.put('/api/admin/questions/sessions/:id', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: (req) => `/questions/admin/sessions/${(req as Request & { params: Record<string, string> }).params.id}`,
  userResHeaderDecorator: fixCORSHeaders,
}));
app.delete('/api/admin/questions/sessions/:id', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: (req) => `/questions/admin/sessions/${(req as Request & { params: Record<string, string> }).params.id}`,
  userResHeaderDecorator: fixCORSHeaders,
}));

app.post('/api/admin/questions/exam-series', requireAuth, async (req: Request, res: Response) => {
  try {
    const upstream = await fetch(`${CONTENT_URL}/questions/admin/exam-series`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': req.headers['x-user-id'] as string || '' },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err: unknown) {
    console.error('[exam-series POST]', (err as Error).message);
    res.status(502).json({ error: 'Erreur de connexion au service de contenu.' });
  }
});

app.get('/api/admin/questions/exam-series', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: (req) => {
    const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    return `/questions/admin/exam-series${qs}`;
  },
  userResHeaderDecorator: fixCORSHeaders,
}));

app.get('/api/questions/exam-series', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: (req) => {
    const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    return `/questions/exam-series${qs}`;
  },
  userResHeaderDecorator: fixCORSHeaders,
}));

app.get('/api/admin/questions/bank', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: (req) => {
    const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    return `/questions/admin/bank${qs}`;
  },
  userResHeaderDecorator: fixCORSHeaders,
}));
app.post('/api/admin/questions/bank', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: () => '/questions/admin/bank',
  userResHeaderDecorator: fixCORSHeaders,
}));
app.put('/api/admin/questions/bank/:id', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: (req) => `/questions/admin/bank/${(req as Request & { params: Record<string, string> }).params.id}`,
  userResHeaderDecorator: fixCORSHeaders,
}));
app.delete('/api/admin/questions/bank/:id', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: (req) => `/questions/admin/bank/${(req as Request & { params: Record<string, string> }).params.id}`,
  userResHeaderDecorator: fixCORSHeaders,
}));

app.get('/api/admin/questions', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: () => '/questions?limit=300',
  userResHeaderDecorator: fixCORSHeaders,
}));

app.use('/api/admin', requireAuth, proxy(PROGRESS_URL, {
  proxyReqPathResolver: (req) => `/admin${req.url}`,
  userResHeaderDecorator: fixCORSHeaders,
}));

app.use('/api/surveys', requireAuth, proxy(PROGRESS_URL, {
  proxyReqPathResolver: (req) => `/surveys${req.url}`,
  userResHeaderDecorator: fixCORSHeaders,
}));

app.use('/api/events', proxy(PROGRESS_URL, {
  proxyReqPathResolver: (req) => `/events${req.url}`,
  userResHeaderDecorator: fixCORSHeaders,
}));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gateway' }));

export default app;
