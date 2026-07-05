import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendBrevo } from '../../../lib/email';

const schema = z.object({
  category:    z.enum(['bug', 'contenu', 'paiement', 'autre']),
  description: z.string().min(10).max(5000),
  email:       z.string().email().optional().or(z.literal('')),
  url:         z.string().url().optional().or(z.literal('')),
});

const CATEGORY_LABELS: Record<string, string> = {
  bug:      '🐛 Bug technique',
  contenu:  '📝 Erreur de contenu',
  paiement: '💳 Problème de paiement',
  autre:    '❓ Autre',
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 });
  }

  const { category, description, email, url } = parsed.data;
  const adminEmail = process.env.ADMIN_EMAIL || 'frranklinlontsi99@gmail.com';
  const label = CATEGORY_LABELS[category] ?? category;

  try {
    await sendBrevo({
      to:      adminEmail,
      ...(email ? { replyTo: email } : {}),
      from:    { name: 'RéussirTCF Support', email: 'support@reussirtcf.ca' },
      subject: `[Signalement] ${label}`,
      html: `
        <h2 style="color:#111827;margin:0 0 20px">🚨 Nouveau signalement</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr style="background:#f9fafb">
            <td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:700;width:30%">Catégorie</td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb">${label}</td>
          </tr>
          ${email ? `
          <tr>
            <td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:700">Email</td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb"><a href="mailto:${email}" style="color:#dc2626">${email}</a></td>
          </tr>` : ''}
          ${url ? `
          <tr style="background:#f9fafb">
            <td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:700">URL</td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb"><a href="${url}" style="color:#dc2626">${url}</a></td>
          </tr>` : ''}
        </table>
        <div style="background:#f9fafb;border-left:4px solid #dc2626;padding:16px 20px;border-radius:0 8px 8px 0">
          <p style="margin:0;white-space:pre-wrap;line-height:1.6;color:#374151">${description}</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Report] Erreur Brevo:', err);
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
