import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import aiRoutes from './routes/ai';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json({ limit: '50kb' }));
app.use(rateLimit({
  windowMs: 60_000,
  max: process.env.NODE_ENV === 'production' ? 30 : 100_000,
  message: { error: 'Limite IA atteinte, patientez 1 minute.' },
}));

app.use('/ai', aiRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ai' }));

export default app;
