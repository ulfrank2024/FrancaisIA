'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

export default function PendingApprovalPage() {
  const { user } = useUser();
  const meta = user?.unsafeMetadata as { role?: string } | undefined;

  // Si déjà approuvé, rediriger
  if (meta?.role === 'professeur') {
    if (typeof window !== 'undefined') window.location.href = '/prof/dashboard';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-emerald-950 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-10 max-w-md w-full text-center space-y-6 text-white">

        <div className="relative">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 mx-auto" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">👨‍🏫</div>
        </div>

        <div>
          <h1 className="text-2xl font-black">Demande en cours de validation</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Ton accès professeur est en attente de validation par l'administrateur de la plateforme.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <span className="text-slate-300">Ta demande a bien été reçue</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 mt-0.5">⏳</span>
            <span className="text-slate-300">L'administrateur va examiner ton profil</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-slate-500 mt-0.5">📧</span>
            <span className="text-slate-400">Tu recevras un email dès la décision prise</span>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          En attendant, tu peux utiliser la plateforme comme apprenant
        </p>

        <div className="flex gap-3">
          <Link href="/dashboard"
            className="flex-1 bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-xl transition-colors text-sm text-center">
            Accéder au dashboard
          </Link>
          <button onClick={() => window.location.reload()}
            className="flex-1 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold py-3 rounded-xl transition-colors text-sm">
            Vérifier le statut
          </button>
        </div>
      </motion.div>
    </div>
  );
}
