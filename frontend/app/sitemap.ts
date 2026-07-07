import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://reussir-tcf.ca').replace(/\/$/, '');
  const now = new Date();

  return [
    { url: site,                          lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${site}/pricing`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${site}/register`,            lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${site}/login`,               lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${site}/formation`,           lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${site}/formation-eo`,        lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${site}/legal/terms`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${site}/legal/privacy`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${site}/legal/contact`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${site}/legal/refund`,        lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${site}/legal/accessibility`, lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
  ];
}
