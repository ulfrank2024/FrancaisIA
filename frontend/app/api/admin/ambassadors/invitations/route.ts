import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const PROGRESS_URL  = process.env.PROGRESS_SERVICE_URL ?? 'https://progress-service-ulrich-lontsis-projects.vercel.app';
const INTERNAL_KEY  = process.env.INTERNAL_SECRET ?? '';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? '';

async function assertAdmin() {
  const { userId } = await auth();
  if (!userId || userId !== ADMIN_USER_ID) throw new Error('forbidden');
}

const h = () => ({ 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_KEY });

// GET — liste les invitations en attente
export async function GET() {
  try { await assertAdmin(); } catch { return NextResponse.json({ error: 'Accès refusé' }, { status: 403 }); }

  const r = await fetch(`${PROGRESS_URL}/ambassadors/invitations`, { headers: h() });
  const d = await r.json();
  return NextResponse.json(d, { status: r.status });
}

