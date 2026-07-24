import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';

const PROGRESS_URL = process.env.PROGRESS_SERVICE_URL ?? 'https://progress-service-ulrich-lontsis-projects.vercel.app';
const INTERNAL_KEY = process.env.INTERNAL_SECRET ?? '';

const schema = z.object({ refCode: z.string().min(3).max(20) });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Code invalide' }, { status: 400 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? '';
  const name  = user?.fullName ?? user?.firstName ?? undefined;

  const res = await fetch(`${PROGRESS_URL}/ambassadors/referral`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_KEY },
    body:    JSON.stringify({
      refCode:        parsed.data.refCode,
      referredEmail:  email,
      referredName:   name,
      referredUserId: userId,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: (err as { error?: string }).error ?? 'Erreur serveur' }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
