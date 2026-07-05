import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();

  if (!userId || userId !== process.env.ADMIN_USER_ID) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
