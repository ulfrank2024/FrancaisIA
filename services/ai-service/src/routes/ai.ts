import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const userMessage = `
Section TCF: ${section === 'EE' ? 'Expression Écrite' : 'Expression Orale'}
${prompt ? `Consigne: ${prompt}` : ''}

Texte de l'apprenant:
"""
${text}
"""

Fournis une correction structurée avec:
1. Score /100
2. Points forts (2-3 éléments)
3. Erreurs à corriger (avec explications claires)
4. Version corrigée du texte
5. Conseils personnalisés pour progresser

Réponds en JSON avec les clés: score, strengths (string[]), errors ({text, correction, rule}[]), correctedVersion, tips (string[]).`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: TUTOR_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Réponse inattendue');

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Format de réponse invalide');

    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
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
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: TUTOR_SYSTEM,
      messages: parsed.data.messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch {
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
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: TUTOR_SYSTEM,
      messages: [{
        role: 'user',
        content: `Explique ce point de grammaire de façon claire et simple pour un apprenant préparant le TCF Canada : "${parsed.data.topic}". Donne 2 exemples concrets et une règle facile à retenir.`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    res.json({ explanation: text });
  } catch {
    res.status(500).json({ error: "Erreur lors de l'explication." });
  }
});

export default router;
