import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import webhookRoutes from './routes/webhooks';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

// Garder le raw body pour la vérification HMAC de Svix — NE PAS parser ici
app.use('/webhooks', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10kb' }));
app.use(rateLimit({ windowMs: 60_000, max: process.env.NODE_ENV === 'production' ? 50 : 100_000 }));

app.use('/webhooks', webhookRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-webhook' }));

export default app;
