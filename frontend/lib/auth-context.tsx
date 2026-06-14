'use client';
import { useMemo } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export type AppUser = {
  id: string;
  email: string;
  full_name: string;
  avatarUrl?: string | null;
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
    };
  }, [user?.id, user?.primaryEmailAddress?.emailAddress, user?.fullName, user?.firstName, user?.imageUrl]);

  async function logout() {
    await signOut();
    router.push('/');
  }

  return { user: appUser, loading: !isLoaded, logout, getToken };
}
