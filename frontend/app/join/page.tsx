'use client';
import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import SophieAvatar from '../../components/SophieAvatar';
import Spinner from '../../components/Spinner';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

const JOIN_CODE_KEY = 'reussirtcf_pending_join_code';

function JoinPageInner() {
  const { user } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ name: string } | null>(null);

  // Pré-remplir le code depuis ?code=XXXXXX ou localStorage
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      setCode(urlCode.toUpperCase());
    } else {
      const saved = localStorage.getItem(JOIN_CODE_KEY);
      if (saved) setCode(saved);
    }
  }, [searchParams]);

  // Si connecté mais pas encore onboardé → auto-onboarder comme apprenant
  useEffect(() => {
    if (!clerkUser) return;
    const meta = (clerkUser.unsafeMetadata ?? {}) as { completedOnboarding?: boolean; role?: string };
    if (!meta.completedOnboarding || !meta.role) {
      clerkUser.update({
        unsafeMetadata: { ...clerkUser.unsafeMetadata, role: 'apprenant', completedOnboarding: true },
      }).catch(() => {});
    }
  }, [clerkUser]);

  function handleGoToLogin() {
    if (code) localStorage.setItem(JOIN_CODE_KEY, code);
    router.push('/login');
  }

  async function handleJoin() {
    if (!code.trim() || !user) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.classes.join({ inviteCode: code.trim(), studentId: user.id });
      localStorage.removeItem(JOIN_CODE_KEY);
      setSuccess({ name: res.class.name });
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Code invalide ou déjà utilisé');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-3xl font-black text-slate-900">
            <span className="text-red-600">🍁</span> RéussirTCF
          </Link>
          <p className="text-slate-500 text-sm mt-2">Rejoindre la classe de ton professeur</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-6">
          <div className="flex justify-center">
            <SophieAvatar mood="explain" size="sm" showMessage={false} />
          </div>

          {success ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-3">
              <div className="text-5xl">🎉</div>
              <h2 className="text-xl font-black text-slate-800">Tu as rejoint la classe !</h2>
              <p className="text-slate-500 text-sm"><strong>{success.name}</strong></p>
              <p className="text-xs text-slate-400">Redirection vers ton dashboard...</p>
            </motion.div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-black text-slate-800 text-center">Entrer le code de ta classe</h2>
                <p className="text-slate-500 text-sm text-center mt-1">Ton professeur t&apos;a fourni un code à 6 caractères</p>
              </div>

              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="ex : AB12CD"
                maxLength={6}
                className="w-full border-2 border-slate-200 rounded-2xl px-5 py-4 text-center text-2xl font-black tracking-[0.3em] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all uppercase"
              />

              {error && <p className="text-red-500 text-sm text-center bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

              {!user ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 text-center">Tu dois être connecté pour rejoindre une classe</p>
                  <button
                    onClick={handleGoToLogin}
                    className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-3 rounded-xl text-center"
                  >
                    Se connecter / S&apos;inscrire
                  </button>
                  <p className="text-xs text-slate-400 text-center">Le code sera conservé pendant ta connexion</p>
                </div>
              ) : (
                <motion.button
                  onClick={handleJoin}
                  disabled={code.length < 4 || loading}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-4 rounded-2xl shadow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <><Spinner size={18} color="#fff" /> Vérification...</> : '🏫 Rejoindre la classe'}
                </motion.button>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner size={40} /></div>}>
      <JoinPageInner />
    </Suspense>
  );
}
