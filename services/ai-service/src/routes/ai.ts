import { Router, Request, Response } from 'express';
import Groq from 'groq-sdk';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

// Limite stricte par token JWT (ou par IP en fallback) — endpoints IA lourds
const heavyAiLimit = rateLimit({
  windowMs: 60_000,
  max: process.env.NODE_ENV === 'production' ? 5 : 1_000_000,
  message: { error: 'Limite IA atteinte (5 requêtes/min). Patientez 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = req.headers.authorization;
    // Clé par token (unique par utilisateur) sinon par IP
    return auth ? `jwt:${auth.slice(7, 47)}` : (req.ip ?? 'anon');
  },
});

const TUTOR_SYSTEM = `Tu es Sophie, une tutrice experte en français langue seconde, spécialisée dans la préparation au TCF Canada.
Tu aides les candidats à améliorer leur français pour réussir leur immigration au Canada.
Tu parles toujours en français, avec un ton encourageant, bienveillant et professionnel.
Pour les corrections, tu expliques clairement les erreurs et donnes des règles mnémotechniques.
Tu adaptes ton niveau à celui de l'apprenant.`;

const correctSchema = z.object({
  text: z.string().min(1).max(2000),
  section: z.enum(['EE', 'EO']),
  prompt: z.string().max(500).optional(),
});

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(1000),
  })).min(1).max(20),
});

const explainSchema = z.object({
  topic: z.string().min(1).max(200),
});

// POST /ai/correct — correction d'une réponse EE ou EO
router.post('/correct', heavyAiLimit, async (req: Request, res: Response): Promise<void> => {
  // Vérification du plan — seuls les abonnés payants peuvent utiliser la correction IA
  const userPlan = (req.headers['x-user-plan'] as string) || 'free';
  const PAID_PLANS = ['bronze', 'silver', 'gold', 'pro', 'annual'];
  const isPaid = PAID_PLANS.includes(userPlan);

  if (!isPaid) {
    res.status(403).json({
      error: 'La correction IA est réservée aux abonnés. Découvrez nos offres sur /pricing.',
      code: 'PLAN_REQUIRED',
    });
    return;
  }

  const parsed = correctSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { text, section, prompt } = parsed.data;

  // Bronze : correction IA uniquement pour EE
  if (userPlan === 'bronze' && section !== 'EE') {
    res.status(403).json({
      error: 'Le plan Bronze inclut la correction IA uniquement pour l\'Expression Écrite (EE). Passez à Silver pour toutes les sections.',
      code: 'BRONZE_EE_ONLY',
    });
    return;
  }

  const userMessage = `Section TCF: ${section === 'EE' ? 'Expression Écrite' : 'Expression Orale'}
${prompt ? `Consigne: ${prompt}` : ''}

Texte de l'apprenant:
"""
${text}
"""

Fournis une correction structurée. Réponds UNIQUEMENT en JSON valide avec exactement ces clés:
{
  "score": <nombre entre 0 et 100>,
  "strengths": ["point fort 1", "point fort 2"],
  "errors": [{"text": "texte erroné", "correction": "correction", "rule": "règle grammaticale"}],
  "correctedVersion": "version corrigée complète",
  "tips": ["conseil 1", "conseil 2"]
}`;

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.3,
      messages: [
        { role: 'system', content: TUTOR_SYSTEM },
        { role: 'user', content: userMessage },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Format de réponse invalide');

    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('[ai/correct]', err);
    res.status(500).json({ error: 'Erreur lors de la correction.' });
  }
});

// POST /ai/chat — conversation libre avec streaming SSE
router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 512,
      temperature: 0.7,
      stream: true,
      messages: [
        { role: 'system', content: TUTOR_SYSTEM },
        ...parsed.data.messages,
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[ai/chat]', err);
    res.write('data: {"error":"Erreur de connexion avec l\'IA."}\n\n');
    res.end();
  }
});

// POST /ai/generate-eo — génère un sujet EO Tâche 2 ou Tâche 3 via IA
const generateEOSchema = z.object({
  taskNumber: z.coerce.number().int().min(2).max(3),
  usedThemes: z.array(z.string()).optional().default([]),
});

router.post('/generate-eo', heavyAiLimit, async (req: Request, res: Response): Promise<void> => {
  const parsed = generateEOSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { taskNumber, usedThemes } = parsed.data;

  const avoidStr = usedThemes.length > 0
    ? `Évite ces thèmes déjà utilisés : ${usedThemes.join(', ')}.`
    : '';

  const prompt = taskNumber === 2
    ? `Tu génères un sujet de Tâche 2 pour l'EO du TCF Canada (Exercice en interaction).
${avoidStr}
Le candidat joue un rôle dans une situation de la vie quotidienne au Canada.
Génère une situation concrète et réaliste : chercher un logement, s'inscrire à un service, résoudre un problème avec un fournisseur, organiser un événement, etc.
Contexte : candidats francophones d'Afrique subsaharienne s'installant au Canada.

Réponds UNIQUEMENT en JSON valide :
{
  "question": "Description complète du scénario en 2-3 phrases. Précise qui est le candidat, qui est l'examinateur, et quel est l'objectif de l'échange.",
  "theme": "mot-clé du thème (ex: logement, emploi, santé, transport...)"
}`
    : `Tu génères un sujet de Tâche 3 pour l'EO du TCF Canada (Expression d'un point de vue).
${avoidStr}
Le candidat doit défendre sa position sur un sujet de société pendant 4 min 30.
Choisis un sujet accessible, d'actualité, qui touche à la vie quotidienne, à l'immigration, au travail, à la famille, à la technologie ou à la société.
Génère aussi 3 questions de relance que l'examinateur poserait.
Contexte : candidats francophones d'Afrique subsaharienne s'installant au Canada.

Réponds UNIQUEMENT en JSON valide :
{
  "question": "Le sujet d'argumentation posé au candidat, sous forme de question ouverte.",
  "theme": "mot-clé du thème (ex: immigration, technologie, éducation, travail...)",
  "relances": "question1|question2|question3"
}`;

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 400,
      temperature: 0.85,
      messages: [
        { role: 'system', content: 'Tu es un expert de la conception de sujets pour l\'examen TCF Canada. Tu réponds uniquement en JSON valide.' },
        { role: 'user', content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content ?? '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Format invalide');

    const data = JSON.parse(jsonMatch[0]) as { question: string; theme: string; relances?: string };
    res.json({ taskNumber, question: data.question, theme: data.theme, relances: data.relances ?? null });
  } catch (err) {
    console.error('[ai/generate-eo]', err);
    res.status(500).json({ error: 'Erreur lors de la génération du sujet.' });
  }
});

// POST /ai/explain — explication d'un point grammatical
router.post('/explain', async (req: Request, res: Response): Promise<void> => {
  const parsed = explainSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 600,
      temperature: 0.5,
      messages: [
        { role: 'system', content: TUTOR_SYSTEM },
        {
          role: 'user',
          content: `Explique ce point de grammaire de façon claire et simple pour un apprenant préparant le TCF Canada : "${parsed.data.topic}". Donne 2 exemples concrets et une règle facile à retenir.`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? '';
    res.json({ explanation: text });
  } catch (err) {
    console.error('[ai/explain]', err);
    res.status(500).json({ error: "Erreur lors de l'explication." });
  }
});

// POST /ai/eo-correction — Sophie génère une correction/exemple de réponse pour une question EO
const eoCorrectionSchema = z.object({
  taskNumber: z.number().int().min(1).max(3),
  question: z.string().min(1).max(1000),
  theme: z.string().max(100).optional(),
});

router.post('/eo-correction', heavyAiLimit, async (req: Request, res: Response): Promise<void> => {
  const parsed = eoCorrectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { taskNumber, question, theme } = parsed.data;

  const prompts: Record<number, string> = {
    1: `Voici la consigne de la Tâche 1 (présentation personnelle) du TCF Canada EO :
"${question}"

Donne un exemple de réponse modèle structurée (2 minutes de discours oral) avec :
1. Une introduction naturelle
2. La présentation de l'identité et du parcours
3. Les centres d'intérêt / loisirs
4. Le projet d'immigration au Canada
5. Une conclusion
Inclus des conseils sur le ton, la durée et les erreurs à éviter.`,

    2: `Voici une question de la Tâche 2 (interaction situationnelle) du TCF Canada EO :
"${question}"${theme ? `\nThème : ${theme}` : ''}

Génère un exemple de dialogue modèle avec :
1. 5 à 6 questions pertinentes que le candidat pourrait poser
2. Pour chaque question, une réponse exemple de l'examinateur
3. Des formules de politesse et connecteurs à utiliser
4. Les erreurs fréquentes à éviter dans ce type de situation`,

    3: `Voici un sujet de la Tâche 3 (expression d'un point de vue) du TCF Canada EO :
"${question}"${theme ? `\nThème : ${theme}` : ''}

Génère une réponse modèle structurée avec :
1. Une prise de position claire (pour/contre/nuancée)
2. Argument 1 avec exemple concret
3. Argument 2 avec exemple concret
4. Une concession (reconnaître le point de vue opposé)
5. Une conclusion personnelle forte
Inclus le vocabulaire clé et les connecteurs logiques à utiliser.`,
  };

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 800,
      temperature: 0.6,
      messages: [
        { role: 'system', content: TUTOR_SYSTEM },
        { role: 'user', content: prompts[taskNumber] },
      ],
    });

    const correction = response.choices[0]?.message?.content ?? '';
    res.json({ correction, taskNumber });
  } catch (err) {
    console.error('[ai/eo-correction]', err);
    res.status(500).json({ error: 'Erreur lors de la génération de la correction.' });
  }
});

export default router;
