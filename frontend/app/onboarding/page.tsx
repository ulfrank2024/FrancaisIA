'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import SophieAvatar from '../../components/SophieAvatar';
import Spinner from '../../components/Spinner';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;

    user.reload().then(async () => {
      const meta = (user.unsafeMetadata ?? {}) as Record<string, unknown>;

      // Déjà onboardé → rediriger directement
      if (meta.completedOnboarding) {
        router.replace(
          meta.role === 'admin' ? '/admin/dashboard'
          : meta.role === 'professeur' ? '/prof/dashboard'
          : '/dashboard'
        );
        return;
      }

      // Compléter l'onboarding automatiquement — tout le monde est apprenant
      await user.update({
        unsafeMetadata: { ...meta, role: 'apprenant', completedOnboarding: true },
      }).catch(() => {});

      setDone(true);
      setTimeout(() => router.replace('/dashboard'), 1800);
    }).catch(() => {});
  }, [isLoaded, user, router]);

  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-slate-50">
      <Spinner size={36} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-50 flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 text-center"
      >
        <SophieAvatar mood={done ? 'celebrate' : 'idle'} size="md" showMessage={false} />

        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {done ? 'Bienvenue sur RéussirTCF !' : 'Préparation de ton espace…'}
          </h1>
          <p className="text-slate-500 mt-2 max-w-xs">
            {done ? 'Sophie est prête à t\'entraîner pour le TCF Canada.' : 'Un instant…'}
          </p>
        </div>

        {done ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-indigo-600">
            <Spinner size={16} color="#4f46e5" />
            Redirection vers ton dashboard…
          </motion.div>
        ) : (
          <Spinner size={28} />
        )}
      </motion.div>
    </div>
  );
}
