import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { prisma } from '../db/prisma';

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
    const payload = wh.verify(JSON.stringify(req.body), {
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
