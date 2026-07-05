'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;

    user.reload().then(async () => {
      const meta = (user.unsafeMetadata ?? {}) as Record<string, unknown>;

      if (meta.completedOnboarding) {
        router.replace(
          meta.role === 'admin'      ? '/admin/dashboard'
          : meta.role === 'professeur' ? '/prof/dashboard'
          : '/dashboard'
        );
        return;
      }

      await user.update({
        unsafeMetadata: { ...meta, role: 'apprenant', completedOnboarding: true },
      }).catch(() => {});

      setDone(true);
      setTimeout(() => router.replace('/dashboard'), 2000);
    }).catch(() => {});
  }, [isLoaded, user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-8 text-center max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={done ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.5 }}
            className="text-6xl leading-none select-none"
          >
            🍁
          </motion.div>
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900">RéussirTCF</div>
            <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase mt-1">Préparation TCF Canada</div>
          </div>
        </div>

        {/* Message */}
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <h1 className="text-xl font-black text-slate-900">Bienvenue sur RéussirTCF !</h1>
              <p className="text-sm text-slate-500">Ton espace est prêt. Redirection…</p>
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <h1 className="text-xl font-black text-slate-900">Préparation de ton espace…</h1>
              <p className="text-sm text-slate-500">Un instant, ça arrive vite.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Barre de progression */}
        <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-red-600 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: done ? '100%' : '60%' }}
            transition={{ duration: done ? 0.4 : 1.2, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </div>
  );
}
