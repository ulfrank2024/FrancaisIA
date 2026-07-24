import { NextRequest, NextResponse } from 'next/server';

const PROGRESS_URL = process.env.PROGRESS_SERVICE_URL ?? 'https://progress-service-ulrich-lontsis-projects.vercel.app';
const INTERNAL_KEY = process.env.INTERNAL_SECRET ?? '';

// Valide un token d'invitation (appelé depuis la page /ambassador/join côté client)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 });

  const r = await fetch(`${PROGRESS_URL}/ambassadors/invite/${token}`);
  const d = await r.json();
  return NextResponse.json(d, { status: r.status });
}
