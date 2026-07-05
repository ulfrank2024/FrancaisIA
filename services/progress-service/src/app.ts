import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import progressRoutes from './routes/progress';
import classRoutes from './routes/classes';
import adminRoutes from './routes/admin';
import lessonRoutes from './routes/lessons';
import surveyRoutes from './routes/surveys';
import eventRoutes from './routes/events';
import internalRoutes from './routes/internal';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 60_000, max: process.env.NODE_ENV === 'production' ? 200 : 100_000 }));

app.use('/progress', progressRoutes);
app.use('/classes', classRoutes);
app.use('/admin', adminRoutes);
app.use('/lessons', lessonRoutes);
app.use('/surveys', surveyRoutes);
app.use('/events', eventRoutes);
app.use('/internal', internalRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'progress' }));

export default app;
