import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendBrevo } from '../../../lib/email';

const schema = z.object({
  name:    z.string().min(2).max(100),
  email:   z.string().email(),
  subject: z.string().min(2).max(200),
  message: z.string().min(10).max(5000),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 });
  }

  const { name, email, subject, message } = parsed.data;
  const adminEmail = process.env.ADMIN_EMAIL || 'frranklinlontsi99@gmail.com';

  try {
    await sendBrevo({
      to:      adminEmail,
      replyTo: email,
      from:    { name: 'RéussirTCF Support', email: 'support@reussir-tcf.ca' },
      subject: `[Contact] ${subject}`,
      html: `
        <h2 style="color:#111827;margin:0 0 20px">📬 Nouveau message de contact</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr style="background:#f9fafb">
            <td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:700;width:30%">Nom</td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb">${name}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:700">Email</td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb"><a href="mailto:${email}" style="color:#dc2626">${email}</a></td>
          </tr>
          <tr style="background:#f9fafb">
            <td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:700">Sujet</td>
            <td style="padding:10px 14px;border:1px solid #e5e7eb">${subject}</td>
          </tr>
        </table>
        <div style="background:#f9fafb;border-left:4px solid #dc2626;padding:16px 20px;border-radius:0 8px 8px 0">
          <p style="margin:0;white-space:pre-wrap;line-height:1.6;color:#374151">${message}</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Contact] Erreur Brevo:', err);
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
