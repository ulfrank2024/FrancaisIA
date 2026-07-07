'use client';
import { useMemo } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export type AppUser = {
  id: string;
  email: string;
  full_name: string;
  avatarUrl?: string | null;
  role?: string;
};

export function useAuth() {
  const { user, isLoaded } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const router = useRouter();

  const appUser = useMemo<AppUser | null>(() => {
    if (!user) return null;
    return {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? '',
      full_name: user.fullName ?? user.firstName ?? 'Utilisateur',
      avatarUrl: user.imageUrl,
      role: (user.unsafeMetadata?.role as string)
        ?? (user.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID ? 'admin' : undefined),
    };
  }, [user?.id, user?.primaryEmailAddress?.emailAddress, user?.fullName, user?.firstName, user?.imageUrl, user?.unsafeMetadata]);

  // Plan depuis Clerk unsafeMetadata — mis à jour par le webhook Stripe
  // Si subscriptionEnd est dépassé, on retombe sur free côté client aussi
  const userPlan = useMemo<string>(() => {
    if (!user) return 'free';
    const plan   = (user.unsafeMetadata?.plan as string) ?? 'free';
    if (plan === 'free') return 'free';
    const subEnd = user.unsafeMetadata?.subscriptionEnd as string | undefined;
    if (subEnd && new Date(subEnd) < new Date()) return 'free';
    return plan;
  }, [user?.unsafeMetadata]);

  async function logout() {
    await signOut();
    router.push('/');
  }

  return { user: appUser, loading: !isLoaded, logout, getToken, userPlan };
}
