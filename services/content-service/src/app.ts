import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import questionsRoutes from './routes/questions';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json({ limit: '500kb' }));
app.use(rateLimit({ windowMs: 60_000, max: process.env.NODE_ENV === 'production' ? 100 : 100_000 }));

app.use('/questions', questionsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'content' }));

export default app;
