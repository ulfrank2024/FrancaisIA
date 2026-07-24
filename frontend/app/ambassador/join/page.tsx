'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';

const PROGRESS_URL = process.env.NEXT_PUBLIC_PROGRESS_URL_PUBLIC ?? '';

interface InviteInfo { email: string; commissionPct: number; }

function JoinContent() {
  const params   = useSearchParams();
  const router   = useRouter();
  const token    = params.get('token') ?? '';
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();

  const [invite, setInvite]       = useState<InviteInfo | null>(null);
  const [step, setStep]           = useState<'loading' | 'invalid' | 'used' | 'auth' | 'form' | 'creating' | 'done'>('loading');
  const [paymentInfo, setPayment] = useState('');
  const [error, setError]         = useState('');

  // 1. Valide le token
  useEffect(() => {
    if (!token) { setStep('invalid'); return; }
    fetch(`/api/ambassador/invite?token=${token}`)
      .then(r => {
        if (r.status === 404) throw new Error('invalid');
        if (r.status === 410) throw new Error('used');
        if (!r.ok)            throw new Error('invalid');
        return r.json();
      })
      .then(d => {
        setInvite(d.invitation);
        setStep(isLoaded && isSignedIn ? 'form' : 'auth');
      })
      .catch(err => setStep(err.message === 'used' ? 'used' : 'invalid'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 2. Quand l'utilisateur vient de se connecter
  useEffect(() => {
    if (!isLoaded || !invite) return;
    if (isSignedIn && step === 'auth') setStep('form');
  }, [isLoaded, isSignedIn, invite, step]);

  // 3. Pré-remplir l'email Interac avec l'email du compte
  useEffect(() => {
    if (!paymentInfo && user?.emailAddresses[0]?.emailAddress) {
      setPayment(user.emailAddresses[0].emailAddress);
    }
  }, [user, paymentInfo]);

  // 4. Accepte l'invitation
  const accept = async () => {
    if (!userId || !user) return;
    setStep('creating');
    try {
      const r = await fetch(`/api/ambassador/join`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          token,
          fullName:    user.fullName ?? user.firstName ?? invite?.email ?? '',
          paymentInfo: paymentInfo || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? 'Erreur serveur'); setStep('form'); return; }
      setStep('done');
      setTimeout(() => router.push('/ambassador'), 1800);
    } catch {
      setError('Erreur réseau'); setStep('form');
    }
  };

  // ── Écrans ──────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <Wrapper>
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Vérification de l&apos;invitation…</p>
        </div>
      </Wrapper>
    );
  }

  if (step === 'invalid') {
    return (
      <Wrapper>
        <div className="text-center py-6">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Lien invalide</h2>
          <p className="text-slate-500 text-sm">Ce lien d&apos;invitation n&apos;existe pas ou a expiré.</p>
        </div>
      </Wrapper>
    );
  }

  if (step === 'used') {
    return (
      <Wrapper>
        <div className="text-center py-6">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Invitation déjà utilisée</h2>
          <p className="text-slate-500 text-sm mb-5">Ce lien a déjà été activé.</p>
          <a href="/ambassador" className="inline-block bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors">
            Accéder à mon espace ambassadeur →
          </a>
        </div>
      </Wrapper>
    );
  }

  if (step === 'auth') {
    return (
      <Wrapper invite={invite}>
        <div className="space-y-3 mt-6">
          <p className="text-sm text-slate-500 text-center mb-4">
            Crée ton compte ou connecte-toi pour activer ton invitation.
          </p>
          <SignUpButton mode="redirect" fallbackRedirectUrl={`/ambassador/join?token=${token}`} forceRedirectUrl={`/ambassador/join?token=${token}`}>
            <button className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors">
              Créer mon compte →
            </button>
          </SignUpButton>
          <SignInButton mode="redirect" fallbackRedirectUrl={`/ambassador/join?token=${token}`} forceRedirectUrl={`/ambassador/join?token=${token}`}>
            <button className="w-full bg-white border border-slate-200 text-slate-700 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
              J&apos;ai déjà un compte
            </button>
          </SignInButton>
        </div>
      </Wrapper>
    );
  }

  if (step === 'form') {
    return (
      <Wrapper invite={invite}>
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Email Interac pour recevoir tes paiements
            </label>
            <input
              type="email"
              value={paymentInfo}
              onChange={e => setPayment(e.target.value)}
              placeholder="ton@email.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <p className="text-xs text-slate-400 mt-1">Tu peux modifier ça plus tard dans ton tableau de bord.</p>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            onClick={accept}
            className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            Activer mon espace ambassadeur →
          </button>
        </div>
      </Wrapper>
    );
  }

  if (step === 'creating') {
    return (
      <Wrapper>
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Activation en cours…</p>
        </div>
      </Wrapper>
    );
  }

  // done
  return (
    <Wrapper>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Bienvenue dans l&apos;équipe !</h2>
        <p className="text-slate-500 text-sm">Tu accèdes à ton espace dans quelques secondes…</p>
      </motion.div>
    </Wrapper>
  );
}

function Wrapper({ children, invite }: { children: React.ReactNode; invite?: InviteInfo | null }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm w-full max-w-sm p-8">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🍁</span>
          <div>
            <p className="font-black text-slate-900 leading-none">RéussirTCF</p>
            <p className="text-xs text-red-600 font-bold">Programme ambassadeurs</p>
          </div>
        </div>

        {invite && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-2">
            <p className="text-sm font-bold text-slate-800 mb-1">Tu es invité(e) 🤝</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Commission de <span className="font-bold text-red-600">{invite.commissionPct}%</span> sur chaque abonnement parrainé.
              Paiement mensuel via Interac.
            </p>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

void PROGRESS_URL; // unused in client — calls go through API routes

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
