import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import proxy from 'express-http-proxy';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.GATEWAY_PORT || 4000;

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:4001';
const CONTENT_URL = process.env.CONTENT_SERVICE_URL || 'http://content-service:4002';
const AI_URL = process.env.AI_SERVICE_URL || 'http://ai-service:4003';
const PROGRESS_URL = process.env.PROGRESS_SERVICE_URL || 'http://progress-service:4004';

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN, credentials: true }));
app.use(express.json({ limit: '50kb' }));
app.use(rateLimit({ windowMs: 15 * 60_000, max: 200 }));

// ── Middleware JWT (sauf routes publiques) ─────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Token manquant.' });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { sub: string };
    req.headers['x-user-id'] = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
}

// ── Routes publiques (auth) ────────────────────────────────────
app.use('/api/auth', proxy(AUTH_URL, {
  proxyReqPathResolver: (req) => `/auth${req.url}`,
}));

// ── Routes protégées ──────────────────────────────────────────
app.use('/api/questions', requireAuth, proxy(CONTENT_URL, {
  proxyReqPathResolver: (req) => `/questions${req.url}`,
}));

app.use('/api/ai', requireAuth, proxy(AI_URL, {
  proxyReqPathResolver: (req) => `/ai${req.url}`,
}));

app.use('/api/progress', requireAuth, proxy(PROGRESS_URL, {
  proxyReqPathResolver: (req) => `/progress${req.url}`,
}));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gateway' }));

app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
