import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const PROGRESS_URL = process.env.PROGRESS_SERVICE_URL ?? 'https://progress-service-ulrich-lontsis-projects.vercel.app';
const INTERNAL_KEY = process.env.INTERNAL_SECRET ?? '';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const r = await fetch(`${PROGRESS_URL}/ambassadors/dashboard/${userId}`, {
    headers: { 'x-internal-key': INTERNAL_KEY },
  });

  if (r.status === 404) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!r.ok)           return NextResponse.json({ error: 'Erreur serveur' }, { status: r.status });

  const data = await r.json();
  return NextResponse.json(data);
}
