'use client';
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Spinner from '../../components/Spinner';

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

    // Vérification admin par ID
    if (user.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID) {
      router.replace('/admin/dashboard');
      return;
    }

    // Code de classe en attente → aller rejoindre la classe en priorité
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
      case 'professeur':
        router.replace('/prof/dashboard');
        break;
      case 'pending_prof':
        router.replace('/pending-approval');
        break;
      default:
        router.replace('/dashboard');
    }
  }, [isLoaded, user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-red-50 to-slate-50">
      <Spinner size={40} />
      <p className="text-slate-500 text-sm">Chargement de ton espace...</p>
    </div>
  );
}
