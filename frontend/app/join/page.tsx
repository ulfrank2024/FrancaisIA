'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SophieAvatar from '../../components/SophieAvatar';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

export default function JoinPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ name: string } | null>(null);

  async function handleJoin() {
    if (!code.trim() || !user) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.classes.join({ inviteCode: code.trim(), studentId: user.id });
      setSuccess({ name: res.class.name });
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Code invalide');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <Link href="/" className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">FrançaisIA</Link>
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
                <p className="text-slate-500 text-sm text-center mt-1">Ton professeur t'a fourni un code à 6 caractères</p>
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
                <div className="text-center space-y-2">
                  <p className="text-sm text-slate-500">Tu dois être connecté pour rejoindre une classe</p>
                  <Link href="/login" className="block bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-3 rounded-xl text-center">
                    Se connecter
                  </Link>
                </div>
              ) : (
                <motion.button
                  onClick={handleJoin}
                  disabled={code.length < 4 || loading}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-4 rounded-2xl shadow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <><span className="animate-spin">⏳</span> Vérification...</> : '🏫 Rejoindre la classe'}
                </motion.button>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
