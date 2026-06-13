'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import SophieAvatar from '../../components/SophieAvatar';
import Spinner from '../../components/Spinner';

export default function RegisterPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      await signUp.create({
        firstName: form.firstName,
        lastName: form.lastName,
        emailAddress: form.email,
        password: form.password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setVerifying(true);
    } catch (err: unknown) {
      const msg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message;
      setError(msg || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const msg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message;
      setError(msg || 'Code incorrect.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <Link href="/" className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
            FrançaisIA
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <div className="flex justify-center mb-6">
            <SophieAvatar mood={loading ? 'thinking' : verifying ? 'explain' : 'happy'} size="sm" showMessage={false} />
          </div>

          {!verifying ? (
            <>
              <h1 className="text-2xl font-black text-slate-800 text-center mb-1">Créer mon compte</h1>
              <p className="text-slate-500 text-center text-sm mb-6">Commence ta préparation TCF Canada gratuitement</p>

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1">Prénom</label>
                    <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                      placeholder="Jean" required
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1">Nom</label>
                    <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                      placeholder="Dupont" required
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="ton@email.com" required
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1">Mot de passe</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Minimum 8 caractères" required minLength={8}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                </div>
                <motion.button type="submit" disabled={loading || !isLoaded}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-3.5 rounded-xl shadow hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <><Spinner size={18} color="#fff" /> Création...</> : 'Créer mon compte'}
                </motion.button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-black text-slate-800 text-center mb-1">Vérifie ton email</h1>
              <p className="text-slate-500 text-center text-sm mb-6">
                Un code a été envoyé à <strong>{form.email}</strong>
              </p>

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</motion.div>
              )}

              <form onSubmit={handleVerify} className="space-y-4">
                <input type="text" value={code} onChange={e => setCode(e.target.value)}
                  placeholder="Code à 6 chiffres" required maxLength={6}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-center tracking-widest text-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                <motion.button type="submit" disabled={loading}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-3.5 rounded-xl shadow flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <><Spinner size={18} color="#fff" /> Vérification...</> : 'Confirmer mon compte'}
                </motion.button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Déjà inscrit ?{' '}
            <Link href="/login" className="text-indigo-600 font-semibold hover:underline">Se connecter</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
