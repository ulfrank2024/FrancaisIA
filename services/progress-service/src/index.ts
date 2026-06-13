import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import progressRoutes from './routes/progress';

const app = express();
const PORT = process.env.PROGRESS_PORT || 4004;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(express.json({ limit: '50kb' }));
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

app.use('/progress', progressRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'progress' }));

app.listen(PORT, () => console.log(`Progress service running on port ${PORT}`));
