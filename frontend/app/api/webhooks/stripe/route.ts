import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';
import { sendBrevo } from '../../../../lib/email';

const PLAN_LABELS: Record<string, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
const PLAN_EMOJI: Record<string, string>  = { bronze: '🥉', silver: '🥈', gold: '🥇' };

const PLAN_DURATION: Record<string, number> = {
  bronze: 30,
  silver: 30,
  gold:   60,
};

const PRICE_TO_PLAN: Record<string, string> = {};

export const dynamic = 'force-dynamic';

async function patchClerk(clerkUserId: string, patch: Record<string, unknown>) {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);
  const existing = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
  await client.users.updateUser(clerkUserId, {
    unsafeMetadata: { ...existing, ...patch },
  });
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  PRICE_TO_PLAN[process.env.STRIPE_PRICE_BRONZE ?? ''] = 'bronze';
  PRICE_TO_PLAN[process.env.STRIPE_PRICE_SILVER ?? ''] = 'silver';
  PRICE_TO_PLAN[process.env.STRIPE_PRICE_GOLD   ?? ''] = 'gold';

  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature invalide:', err);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  try {
    // ── Paiement initial (one-time ou première période d'abonnement) ──
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkUserId = session.client_reference_id;
      if (!clerkUserId) return NextResponse.json({ received: true });

      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 5 });
      const priceId   = lineItems.data[0]?.price?.id ?? '';
      const plan      = PRICE_TO_PLAN[priceId] ?? null;
      if (!plan) { console.warn(`Price ID inconnu: ${priceId}`); return NextResponse.json({ received: true }); }

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + (PLAN_DURATION[plan] ?? 30));

      await patchClerk(clerkUserId, {
        plan,
        subscriptionStart:  now.toISOString(),
        subscriptionEnd:    expiresAt.toISOString(),
        subscriptionStatus: 'active',
        stripeCustomerId:   typeof session.customer === 'string' ? session.customer : undefined,
        stripeSessionId:    session.id,
      });
      console.log(`✅ Plan "${plan}" activé pour ${clerkUserId} — expire le ${expiresAt.toLocaleDateString('fr-CA')}`);

      // Email de confirmation d'abonnement
      const userEmail = session.customer_details?.email;
      const userName  = session.customer_details?.name ?? 'cher(e) apprenant(e)';
      if (userEmail) {
        sendBrevo({
          to:      userEmail,
          subject: `${PLAN_EMOJI[plan] ?? '✅'} Ton abonnement ${PLAN_LABELS[plan] ?? plan} est activé !`,
          html: `
            <h2 style="color:#111827;margin:0 0 8px">${PLAN_EMOJI[plan] ?? '✅'} Abonnement ${PLAN_LABELS[plan] ?? plan} activé !</h2>
            <p style="color:#6b7280;margin:0 0 24px">Bonjour ${userName}, ton paiement a bien été reçu.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr style="background:#f9fafb">
                <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:700;width:40%">Plan</td>
                <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:700;color:#dc2626">${PLAN_EMOJI[plan]} ${PLAN_LABELS[plan] ?? plan}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:700">Activé le</td>
                <td style="padding:12px 16px;border:1px solid #e5e7eb">${now.toLocaleDateString('fr-CA')}</td>
              </tr>
              <tr style="background:#f9fafb">
                <td style="padding:12px 16px;border:1px solid #e5e7eb;font-weight:700">Expire le</td>
                <td style="padding:12px 16px;border:1px solid #e5e7eb">${expiresAt.toLocaleDateString('fr-CA')}</td>
              </tr>
            </table>
            <a href="https://reussir-tcf.ca/dashboard"
               style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:900;font-size:15px">
              Accéder à mon espace →
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px">
              Problème avec ton paiement ? Écris-nous à <a href="mailto:support@reussir-tcf.ca" style="color:#dc2626">support@reussir-tcf.ca</a>
            </p>
          `,
        }).catch(err => console.error('[Brevo] Confirmation abonnement:', err));
      }
    }

    // ── Renouvellement automatique (abonnements Silver/Gold récurrents) ──
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      // Seulement pour les renouvellements (billing_reason = subscription_cycle)
      if ((invoice as { billing_reason?: string }).billing_reason !== 'subscription_cycle') return NextResponse.json({ received: true });

      const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;
      if (!customerId) return NextResponse.json({ received: true });

      // Retrouve le Clerk user via stripeCustomerId
      const lineItem = invoice.lines?.data?.[0] as { price?: { id?: string } } | undefined;
      const priceId = lineItem?.price?.id ?? '';
      const plan    = PRICE_TO_PLAN[priceId] ?? null;
      if (!plan) return NextResponse.json({ received: true });

      // Recherche le user Clerk par stripeCustomerId (via liste paginée)
      const allUsers = await (await clerkClient()).users.getUserList({ limit: 500 });
      const user = allUsers.data.find(u => (u.unsafeMetadata as Record<string, unknown>)?.stripeCustomerId === customerId);
      if (!user) { console.warn(`User Clerk introuvable pour customer ${customerId}`); return NextResponse.json({ received: true }); }

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + (PLAN_DURATION[plan] ?? 30));

      await patchClerk(user.id, {
        plan,
        subscriptionStart:  now.toISOString(),
        subscriptionEnd:    expiresAt.toISOString(),
        subscriptionStatus: 'active',
      });
      console.log(`🔄 Plan "${plan}" renouvelé pour ${user.id} — expire le ${expiresAt.toLocaleDateString('fr-CA')}`);
    }

    // ── Paiement échoué ──
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : null;
      if (!customerId) return NextResponse.json({ received: true });

      const allUsers = await (await clerkClient()).users.getUserList({ limit: 500 });
      const user = allUsers.data.find(u => (u.unsafeMetadata as Record<string, unknown>)?.stripeCustomerId === customerId);
      if (!user) return NextResponse.json({ received: true });

      await patchClerk(user.id, { subscriptionStatus: 'payment_failed' });
      console.warn(`⚠️ Paiement échoué pour ${user.id} (customer ${customerId})`);
    }

    // ── Changement de plan (upgrade / downgrade depuis Stripe Dashboard) ──
    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : null;
      if (!customerId) return NextResponse.json({ received: true });

      const priceId = sub.items?.data?.[0]?.price?.id ?? '';
      const plan    = PRICE_TO_PLAN[priceId] ?? null;
      if (!plan) return NextResponse.json({ received: true });

      const allUsers = await (await clerkClient()).users.getUserList({ limit: 500 });
      const user = allUsers.data.find(u => (u.unsafeMetadata as Record<string, unknown>)?.stripeCustomerId === customerId);
      if (!user) return NextResponse.json({ received: true });

      const now = new Date();
      // current_period_end peut être dans sub ou dans les billing_cycle_anchor selon la version API
      const rawEnd = (sub as unknown as Record<string, unknown>).current_period_end as number | undefined;
      const periodEnd = rawEnd
        ? new Date(rawEnd * 1000)
        : new Date(now.getTime() + (PLAN_DURATION[plan] ?? 30) * 86400_000);

      await patchClerk(user.id, {
        plan,
        subscriptionEnd:    periodEnd.toISOString(),
        subscriptionStatus: sub.status,
      });
      console.log(`🔁 Plan mis à jour → "${plan}" pour ${user.id}`);
    }

    // ── Annulation ou expiration d'abonnement ──
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : null;
      if (!customerId) return NextResponse.json({ received: true });

      const allUsers = await (await clerkClient()).users.getUserList({ limit: 500 });
      const user = allUsers.data.find(u => (u.unsafeMetadata as Record<string, unknown>)?.stripeCustomerId === customerId);
      if (!user) return NextResponse.json({ received: true });

      await patchClerk(user.id, {
        plan:               'free',
        subscriptionStatus: 'cancelled',
        subscriptionEnd:    new Date().toISOString(),
      });
      console.log(`🚫 Abonnement annulé — ${user.id} repassé en plan free`);
    }
  } catch (err) {
    console.error(`[stripe-webhook] ${event.type}:`, err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
