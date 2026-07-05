import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://francaisIA.com';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register'],
        disallow: ['/dashboard', '/admin', '/practice', '/onboarding', '/chat', '/results'],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
