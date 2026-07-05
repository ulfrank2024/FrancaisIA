import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendBrevo } from '../../../lib/email';

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 422 });
  }

  const { email } = parsed.data;
  const adminEmail = process.env.ADMIN_EMAIL || 'frranklinlontsi99@gmail.com';

  sendBrevo({
    to:      adminEmail,
    from:    { name: 'RéussirTCF', email: 'noreply@reussirtcf.ca' },
    subject: `[Newsletter] Nouvel abonné : ${email}`,
    html: `
      <h2 style="color:#111827;margin:0 0 20px">📧 Nouvel abonné newsletter</h2>
      <div style="background:#f9fafb;border-left:4px solid #dc2626;padding:16px 20px;border-radius:0 8px 8px 0">
        <p style="margin:0;font-size:18px;font-weight:700;color:#374151">${email}</p>
      </div>
      <p style="color:#6b7280;font-size:13px;margin-top:16px">Pense à l'ajouter à ta liste Brevo si tu gères une newsletter.</p>
    `,
  }).catch(err => console.error('[Newsletter] Erreur Brevo:', err));

  return NextResponse.json({ ok: true });
}
