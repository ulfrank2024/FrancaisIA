import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import { z } from 'zod';
import { sql } from '../db/db';
import { validateBody } from '../middleware/validateBody';

const router = Router();

const redis = createClient({ url: process.env.REDIS_URL });
redis.connect().catch(console.error);

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe minimum 8 caractères'),
  fullName: z.string().min(2, 'Nom complet requis'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signTokens(userId: string) {
  const accessToken = jwt.sign(
    { sub: userId },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES as string || '15m' }
  );
  const refreshToken = jwt.sign(
    { sub: userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES as string || '7d' }
  );
  return { accessToken, refreshToken };
}

// POST /auth/register
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, password, fullName } = req.body;

  const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.length > 0) {
    res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const rows = await sql`
    INSERT INTO users (email, password_hash, full_name)
    VALUES (${email}, ${passwordHash}, ${fullName})
    RETURNING id, email, full_name
  `;
  const user = rows[0];

  if (!user) {
    res.status(500).json({ error: "Erreur lors de l'inscription." });
    return;
  }

  const { accessToken, refreshToken } = signTokens(user.id);
  await redis.setEx(`refresh:${user.id}`, 7 * 24 * 3600, refreshToken);

  res.status(201).json({ accessToken, refreshToken, user });
});

// POST /auth/login
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const rows = await sql`
    SELECT id, email, full_name, password_hash FROM users WHERE email = ${email} LIMIT 1
  `;
  const user = rows[0];

  if (!user) {
    res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    return;
  }

  const { accessToken, refreshToken } = signTokens(user.id);
  await redis.setEx(`refresh:${user.id}`, 7 * 24 * 3600, refreshToken);

  const { password_hash: _, ...safeUser } = user;
  res.json({ accessToken, refreshToken, user: safeUser });
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Token manquant.' });
    return;
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { sub: string };
    const stored = await redis.get(`refresh:${payload.sub}`);

    if (stored !== refreshToken) {
      res.status(401).json({ error: 'Token invalide ou expiré.' });
      return;
    }

    const { accessToken, refreshToken: newRefresh } = signTokens(payload.sub);
    await redis.setEx(`refresh:${payload.sub}`, 7 * 24 * 3600, newRefresh);

    res.json({ accessToken, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Token invalide.' });
  }
});

// POST /auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { sub: string };
      await redis.del(`refresh:${payload.sub}`);
    } catch {}
  }
  res.json({ message: 'Déconnecté avec succès.' });
});

export default router;
