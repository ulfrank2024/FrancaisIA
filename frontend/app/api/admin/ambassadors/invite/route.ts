import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { sendBrevo } from '../../../../../lib/email';

const PROGRESS_URL  = process.env.PROGRESS_SERVICE_URL ?? 'https://progress-service-ulrich-lontsis-projects.vercel.app';
const INTERNAL_KEY  = process.env.INTERNAL_SECRET ?? '';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? '';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || userId !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const schema = z.object({
    email:         z.string().email(),
    commissionPct: z.number().min(1).max(100).default(30),
  });
  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  // Crée l'invitation dans la DB
  const r = await fetch(`${PROGRESS_URL}/ambassadors/invite`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_KEY },
    body:    JSON.stringify({ email: parsed.data.email, commissionPct: parsed.data.commissionPct, invitedBy: userId }),
  });
  const d = await r.json();
  if (!r.ok) return NextResponse.json(d, { status: r.status });

  const token   = d.invitation.token as string;
  // Dérive l'URL depuis la requête — fiable peu importe l'env (dev/prod)
  const origin  = req.headers.get('origin') ?? `https://${req.headers.get('host')}`;
  const inviteLink = `${origin}/ambassador/join?token=${token}`;

  // Envoie l'email d'invitation
  await sendBrevo({
    to:      parsed.data.email,
    subject: '🤝 Tu es invité(e) à devenir ambassadeur RéussirTCF',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#0f172a;border-radius:16px 16px 0 0;padding:32px;text-align:center">
          <span style="font-size:32px">🍁</span>
          <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:12px 0 4px">RéussirTCF</h1>
          <p style="color:#94a3b8;font-size:13px;margin:0">Programme ambassadeurs</p>
        </div>
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:32px">
          <h2 style="color:#111827;font-size:20px;font-weight:800;margin:0 0 12px">Tu as été sélectionné(e) 🎉</h2>
          <p style="color:#4b5563;line-height:1.6;margin:0 0 20px">
            L'équipe RéussirTCF t'invite à rejoindre notre programme ambassadeurs. En parrainant des personnes qui s'abonnent, tu reçois une commission de <strong style="color:#dc2626">${parsed.data.commissionPct}%</strong> sur chaque abonnement.
          </p>
          <div style="background:#f8fafc;border-left:4px solid #dc2626;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px">
            <p style="margin:0 0 6px;font-weight:700;color:#111827;font-size:14px">Ce que tu reçois :</p>
            <ul style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.8">
              <li>Lien de parrainage personnalisé</li>
              <li>${parsed.data.commissionPct}% de commission sur chaque abonnement parrainé</li>
              <li>Tableau de bord pour suivre tes filleuls et tes revenus</li>
              <li>Paiement mensuel via Interac</li>
            </ul>
          </div>
          <a href="${inviteLink}"
             style="display:block;background:#dc2626;color:#ffffff;padding:16px 24px;border-radius:12px;text-decoration:none;font-weight:900;font-size:16px;text-align:center;letter-spacing:-0.3px">
            Accepter l'invitation →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:20px;text-align:center;line-height:1.5">
            Ce lien est valide jusqu'à ce que tu l'utilises.<br>
            Des questions ? <a href="mailto:support@reussir-tcf.ca" style="color:#dc2626">support@reussir-tcf.ca</a>
          </p>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ ok: true, inviteLink });
}
