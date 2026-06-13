import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import proxy from 'express-http-proxy';
import { verifyToken } from '@clerk/backend';
import type { IncomingHttpHeaders, IncomingMessage, ClientRequest, OutgoingHttpHeaders } from 'http';

const app = express();
const PORT = process.env.GATEWAY_PORT || 4000;

const AUTH_URL     = process.env.AUTH_SERVICE_URL     || 'http://auth-service:4001';
const CONTENT_URL  = process.env.CONTENT_SERVICE_URL  || 'http://content-service:4002';
const AI_URL       = process.env.AI_SERVICE_URL       || 'http://ai-service:4003';
const PROGRESS_URL = process.env.PROGRESS_SERVICE_URL || 'http://progress-service:4004';

const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:3001')
  .split(',').map(s => s.trim());

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50kb' }));
app.use(rateLimit({ windowMs: 15 * 60_000, max: 200 }));

// ── Middleware Clerk ──────────────────────────────────────────────
async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token manquant.' });
    return;
  }
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    req.headers['x-user-id'] = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
}

// ── Webhook Clerk (public — pas de vérif JWT) ─────────────────────
app.use('/api/webhooks', proxy(AUTH_URL, {
  proxyReqPathResolver: (req) => `/webhooks${req.url}`,
}));

// Replace upstream CORS headers with a single, correct value
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

// ── Stats publiques (pas d'auth) ──────────────────────────────────
app.get('/api/stats', proxy(PROGRESS_URL, {
  proxyReqPathResolver: () => '/progress/stats',
  userResHeaderDecorator: fixCORSHeaders,
}));

// ── Routes protégées par Clerk ────────────────────────────────────
app.use('/api/questions', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: (req) => `/questions${req.url}`,
  userResHeaderDecorator: fixCORSHeaders,
}));

app.use('/api/ai', requireAuth, proxy(AI_URL, {
  proxyReqPathResolver: (req) => `/ai${req.url}`,
  userResHeaderDecorator: fixCORSHeaders,
}));

app.use('/api/progress', requireAuth, proxy(PROGRESS_URL, {
  proxyReqPathResolver: (req) => `/progress${req.url}`,
  userResHeaderDecorator: fixCORSHeaders,
}));

app.use('/api/classes', requireAuth, proxy(PROGRESS_URL, {
  proxyReqPathResolver: (req) => `/classes${req.url}`,
  userResHeaderDecorator: fixCORSHeaders,
}));

app.use('/api/admin', requireAuth, proxy(PROGRESS_URL, {
  proxyReqPathResolver: (req) => `/admin${req.url}`,
  userResHeaderDecorator: fixCORSHeaders,
}));

// ── Health ────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gateway' }));

app.listen(PORT, () => console.log(`API Gateway (Clerk) running on port ${PORT}`));
