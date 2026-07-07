import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://reussir-tcf.ca').replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/register', '/login', '/formation', '/formation-eo', '/legal/'],
        disallow: ['/dashboard', '/admin', '/practice', '/onboarding', '/redirect', '/chat', '/results', '/join', '/pending-approval', '/prof/'],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
