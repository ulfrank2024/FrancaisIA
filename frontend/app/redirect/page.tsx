'use client';
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

type Meta = {
  role?: string;
  completedOnboarding?: boolean;
};

export default function RedirectPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.replace('/login'); return; }

    if (user.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      router.replace('/admin/dashboard');
      return;
    }

    const pendingCode = localStorage.getItem('reussirtcf_pending_join_code');
    if (pendingCode) {
      router.replace(`/join?code=${pendingCode}`);
      return;
    }

    const meta = (user.unsafeMetadata ?? {}) as Meta;

    if (!meta.completedOnboarding) {
      router.replace('/onboarding');
      return;
    }

    switch (meta.role) {
      case 'professeur':   router.replace('/prof/dashboard'); break;
      case 'pending_prof': router.replace('/pending-approval'); break;
      default:             router.replace('/dashboard');
    }
  }, [isLoaded, user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-6xl leading-none select-none">🍁</div>
          <div className="text-center">
            <div className="text-2xl font-black tracking-tight text-slate-900">RéussirTCF</div>
            <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase mt-1">Préparation TCF Canada</div>
          </div>
        </div>

        {/* Barre de progression animée */}
        <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-red-600 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
          />
        </div>

        <p className="text-sm text-slate-400 font-medium">Chargement de ton espace…</p>
      </motion.div>
    </div>
  );
}
