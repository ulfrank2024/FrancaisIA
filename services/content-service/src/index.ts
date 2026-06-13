import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import questionsRoutes from './routes/questions';

const app = express();
const PORT = process.env.CONTENT_PORT || 4002;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(express.json({ limit: '10kb' }));
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

app.use('/questions', questionsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'content' }));

app.listen(PORT, () => console.log(`Content service running on port ${PORT}`));
