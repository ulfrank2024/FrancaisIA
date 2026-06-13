import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';

const app = express();
const PORT = process.env.AUTH_PORT || 4001;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(express.json({ limit: '10kb' }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' },
  })
);

app.use('/auth', authRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth' }));

app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`));
