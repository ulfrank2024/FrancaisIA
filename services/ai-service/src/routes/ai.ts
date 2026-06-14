import { Router, Request, Response } from 'express';
import Groq from 'groq-sdk';
import { z } from 'zod';

const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

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
router.post('/correct', async (req: Request, res: Response): Promise<void> => {
  const parsed = correctSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }
  const { text, section, prompt } = parsed.data;

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

export default router;
