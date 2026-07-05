import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default async function ProfLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();

  if (!user) {
    redirect('/login');
  }

  const role = (user.unsafeMetadata?.role as string | undefined) ?? '';
  const isAdmin = user.id === process.env.ADMIN_USER_ID;

  if (!isAdmin && role !== 'professeur') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
