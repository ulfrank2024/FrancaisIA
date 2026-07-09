import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { sendBrevo } from '../../../../lib/email';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const client = await clerkClient();
  const user   = await client.users.getUser(userId);
  const meta   = (user.unsafeMetadata ?? {}) as Record<string, unknown>;

  // Idempotent — ne rien faire si déjà onboardé
  if (meta.completedOnboarding) {
    return NextResponse.json({ ok: true, alreadyDone: true });
  }

  await client.users.updateUser(userId, {
    unsafeMetadata: { ...meta, role: 'apprenant', completedOnboarding: true },
  });

  const email    = user.emailAddresses[0]?.emailAddress;
  const fullName = user.fullName ?? user.firstName ?? 'cher(e) apprenant(e)';

  if (email) {
    sendBrevo({
      to:      email,
      subject: '🍁 Bienvenue sur RéussirTCF !',
      html: `
        <h2 style="color:#111827;margin:0 0 8px">Bienvenue sur RéussirTCF, ${fullName} ! 🍁</h2>
        <p style="color:#6b7280;margin:0 0 20px;line-height:1.6">
          Ton compte est actif. Tu peux commencer à t'entraîner gratuitement dès maintenant —
          compréhension orale, compréhension écrite, expression écrite et expression orale.
        </p>
        <a href="https://reussir-tcf.ca/dashboard"
           style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:900;font-size:15px">
          Accéder à mon espace →
        </a>
        <p style="color:#9ca3af;font-size:13px;margin-top:28px;line-height:1.6">
          Pour accéder à toutes les épreuves et à l'IA, passe en plan payant depuis ton tableau de bord.<br/>
          Des questions ? <a href="mailto:support@reussir-tcf.ca" style="color:#dc2626">support@reussir-tcf.ca</a>
        </p>
      `,
    }).catch(err => console.error('[Onboarding] Email bienvenue:', err));
  }

  return NextResponse.json({ ok: true });
}
