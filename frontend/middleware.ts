import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/register(.*)',
  '/legal(.*)',
  '/pricing(.*)',
  '/onboarding',
  '/redirect',
  '/join',
  '/pending-approval',
  '/api/webhooks(.*)',
  '/api/contact',
  '/api/report',
  '/api/newsletter',
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isProfRoute  = createRouteMatcher(['/prof(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId } = await auth.protect();

  // Admin — seul le compte admin peut accéder
  if (isAdminRoute(req)) {
    if (userId !== process.env.ADMIN_USER_ID) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Prof — vérification du rôle dans le layout (clerkClient trop coûteux ici)
  // Le layout /prof/layout.tsx fait la vérification fine du rôle
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
