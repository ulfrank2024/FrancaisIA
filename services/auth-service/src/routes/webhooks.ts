import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { prisma } from '../db/prisma';
import { sendBrevo } from '../email';

const router = Router();

interface ClerkUserEvent {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    primary_email_address_id: string;
  };
}

// POST /webhooks/clerk — reçoit les événements Clerk
router.post('/clerk', async (req: Request, res: Response): Promise<void> => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(500).json({ error: 'Webhook secret non configuré.' });
    return;
  }

  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ error: 'Headers svix manquants.' });
    return;
  }

  try {
    const wh = new Webhook(webhookSecret);
    // Utiliser le raw body (Buffer) — re-stringifier casse la signature HMAC
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const payload = wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent;

    const { type, data } = payload;
    const primaryEmail = data.email_addresses.find(
      e => e.id === data.primary_email_address_id
    )?.email_address ?? data.email_addresses[0]?.email_address;

    const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || 'Utilisateur';

    if (type === 'user.created') {
      await prisma.user.create({
        data: {
          id: data.id,
          email: primaryEmail,
          fullName,
          avatarUrl: data.image_url,
        },
      });

      // Email de bienvenue (fire-and-forget)
      if (primaryEmail) {
        sendBrevo(
          primaryEmail,
          '🍁 Bienvenue sur RéussirTCF !',
          `
          <h2 style="color:#111827;margin:0 0 8px">Bienvenue, ${fullName} ! 🎉</h2>
          <p style="color:#6b7280;margin:0 0 24px">Ton compte est prêt. Commence dès maintenant à préparer ton TCF Canada avec Sophie, ta tutrice IA.</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr style="background:#fef2f2">
              <td style="padding:14px 16px;border:1px solid #fecaca">🎧</td>
              <td style="padding:14px 16px;border:1px solid #fecaca"><strong>Compréhension Orale</strong> — 39 questions avec audio</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;border:1px solid #e5e7eb">📖</td>
              <td style="padding:14px 16px;border:1px solid #e5e7eb"><strong>Compréhension Écrite</strong> — 39 questions et passages</td>
            </tr>
            <tr style="background:#fef2f2">
              <td style="padding:14px 16px;border:1px solid #fecaca">✍️</td>
              <td style="padding:14px 16px;border:1px solid #fecaca"><strong>Expression Écrite</strong> — Corrections IA instantanées</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;border:1px solid #e5e7eb">🎤</td>
              <td style="padding:14px 16px;border:1px solid #e5e7eb"><strong>Expression Orale</strong> — Sujets et feedback IA</td>
            </tr>
          </table>

          <a href="${process.env.APP_URL || 'https://reussir-tcf.ca'}/dashboard"
             style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:900;font-size:15px">
            Commencer à pratiquer →
          </a>

          <p style="color:#9ca3af;font-size:12px;margin-top:24px">
            Des questions ? Écris-nous à <a href="mailto:${process.env.ADMIN_EMAIL || 'support@reussir-tcf.ca'}" style="color:#dc2626">${process.env.ADMIN_EMAIL || 'support@reussir-tcf.ca'}</a>
          </p>
          `
        ).catch(err => console.error('[Brevo] Bienvenue:', err));
      }
    } else if (type === 'user.updated') {
      await prisma.user.upsert({
        where: { id: data.id },
        update: { email: primaryEmail, fullName, avatarUrl: data.image_url },
        create: { id: data.id, email: primaryEmail, fullName, avatarUrl: data.image_url },
      });
    } else if (type === 'user.deleted') {
      await prisma.user.delete({ where: { id: data.id } }).catch(() => {});
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: 'Webhook invalide.' });
  }
});

export default router;
