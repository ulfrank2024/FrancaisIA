import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

const PROGRESS_URL = process.env.PROGRESS_SERVICE_URL ?? 'https://progress-service-ulrich-lontsis-projects.vercel.app';
const INTERNAL_KEY = process.env.INTERNAL_SECRET ?? '';

const schema = z.object({
  paymentInfo: z.string().email('Adresse courriel invalide').max(200),
});

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const r = await fetch(`${PROGRESS_URL}/ambassadors/profile/${userId}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_KEY },
    body:    JSON.stringify({ paymentInfo: parsed.data.paymentInfo }),
  });

  const d = await r.json();
  return NextResponse.json(d, { status: r.status });
}
