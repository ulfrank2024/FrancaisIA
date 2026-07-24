import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';

const PROGRESS_URL = process.env.PROGRESS_SERVICE_URL ?? 'https://progress-service-ulrich-lontsis-projects.vercel.app';
const INTERNAL_KEY = process.env.INTERNAL_SECRET ?? '';

const schema = z.object({
  token:       z.string(),
  fullName:    z.string().min(2),
  paymentInfo: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  // Résout le nom depuis Clerk si vide
  let { fullName } = parsed.data;
  if (!fullName || fullName.length < 2) {
    const user = await currentUser();
    fullName = user?.fullName ?? user?.firstName ?? '';
  }

  const r = await fetch(`${PROGRESS_URL}/ambassadors/invite/${parsed.data.token}/accept`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_KEY },
    body:    JSON.stringify({ userId, fullName, paymentInfo: parsed.data.paymentInfo }),
  });

  const d = await r.json();
  return NextResponse.json(d, { status: r.status });
}
