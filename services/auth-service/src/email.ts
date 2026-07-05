const BRAND_RED = '#dc2626';
const YEAR      = new Date().getFullYear();

export function emailTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>RéussirTCF</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
        <tr>
          <td style="background:${BRAND_RED};padding:28px 32px;text-align:center">
            <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">🍁 RéussirTCF</div>
            <div style="font-size:12px;color:rgba(255,255,255,.75);margin-top:4px;letter-spacing:1px;text-transform:uppercase">Préparation TCF Canada</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;color:#111827">${content}</td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center">
            <p style="margin:0 0 8px;font-size:12px;color:#6b7280">
              <a href="https://reussirtcf.ca" style="color:${BRAND_RED};text-decoration:none;font-weight:600">reussirtcf.ca</a>
              &nbsp;·&nbsp;
              <a href="https://reussirtcf.ca/legal/contact" style="color:#6b7280;text-decoration:none">Support</a>
              &nbsp;·&nbsp;
              <a href="https://reussirtcf.ca/legal/privacy" style="color:#6b7280;text-decoration:none">Confidentialité</a>
            </p>
            <p style="margin:0;font-size:11px;color:#9ca3af">© ${YEAR} RéussirTCF Inc. · Montréal, Canada 🍁</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendBrevo(to: string, subject: string, html: string) {
  const key = process.env.BREVO_API_KEY;
  if (!key) { console.log(`[Brevo] BREVO_API_KEY non configuré — email non envoyé (to: ${to})`); return; }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:      { name: 'RéussirTCF', email: 'noreply@reussirtcf.ca' },
      to:          [{ email: to }],
      subject,
      htmlContent: emailTemplate(html),
    }),
  });
  if (!res.ok) console.error('[Brevo] Erreur:', await res.text());
}
