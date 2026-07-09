import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { sendBrevo } from '../../../../lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PLAN_LABELS: Record<string, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
const PLAN_EMOJI: Record<string, string>  = { bronze: '🥉', silver: '🥈', gold: '🥇' };

export async function GET(req: NextRequest) {
  // Vercel Cron — vérifier la clé secrète
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ limit: 500 });

  const now = Date.now();
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  let reminded = 0;

  for (const user of users) {
    const meta = (user.unsafeMetadata ?? {}) as Record<string, unknown>;
    const plan   = meta.plan as string | undefined;
    const endStr = meta.subscriptionEnd as string | undefined;
    const status = meta.subscriptionStatus as string | undefined;

    if (!plan || plan === 'free' || status !== 'active' || !endStr) continue;

    const endsAt = new Date(endStr).getTime();
    const msLeft = endsAt - now;

    // Envoyer seulement si l'abonnement expire dans les prochaines 24h après la fenêtre J-3
    if (msLeft < 0 || msLeft > THREE_DAYS) continue;

    const email    = user.emailAddresses[0]?.emailAddress;
    const fullName = user.fullName ?? user.firstName ?? 'cher(e) apprenant(e)';
    if (!email) continue;

    const expiryDate = new Date(endStr).toLocaleDateString('fr-CA');

    try {
      await sendBrevo({
        to:      email,
        subject: `⏳ Ton abonnement ${PLAN_LABELS[plan] ?? plan} expire dans 3 jours`,
        html: `
          <h2 style="color:#111827;margin:0 0 8px">⏳ Ton abonnement expire bientôt</h2>
          <p style="color:#6b7280;margin:0 0 20px;line-height:1.6">
            Bonjour ${fullName}, ton abonnement <strong>${PLAN_EMOJI[plan] ?? ''} ${PLAN_LABELS[plan] ?? plan}</strong> expire le <strong>${expiryDate}</strong>.
          </p>
          <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px">
            <p style="margin:0;color:#92400e;font-size:14px;line-height:1.5">
              Après expiration, tu perdras l'accès aux épreuves CE, EE et EO ainsi qu'à l'assistance IA. Tes résultats et statistiques sont conservés.
            </p>
          </div>
          <a href="https://reussir-tcf.ca/pricing"
             style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:900;font-size:15px">
            Renouveler mon abonnement →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">
            Questions ? <a href="mailto:support@reussir-tcf.ca" style="color:#dc2626">support@reussir-tcf.ca</a>
          </p>
        `,
      });
      reminded++;
    } catch (err) {
      console.error(`[Cron] Rappel expiration ${email}:`, err);
    }
  }

  console.log(`[Cron] Rappels envoyés: ${reminded}`);
  return NextResponse.json({ ok: true, reminded });
}
