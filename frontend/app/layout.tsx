import type { Metadata } from 'next';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { frFR } from '@clerk/localizations';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://reussirtcf.ca';

export const metadata: Metadata = {
  title: {
    default: 'RéussirTCF — Préparation TCF Canada en ligne | Examens simulés & IA',
    template: '%s | RéussirTCF',
  },
  description: 'Prépare et réussis ton TCF Canada en ligne. Examens simulés, corrections IA instantanées, calcul NCLC officiel. La plateforme #1 de la diaspora camerounaise & africaine au Canada.',
  keywords: ['TCF Canada', 'préparation TCF Canada', 'formation TCF Canada en ligne', 'simulateur TCF Canada', 'score TCF Canada', 'NCLC', 'Entrée Express', 'immigration Canada français', 'réussir TCF Canada', 'test connaissance français Canada'],
  authors: [{ name: 'RéussirTCF' }],
  creator: 'RéussirTCF',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'RéussirTCF',
    title: 'RéussirTCF — Préparation TCF Canada en ligne | Examens simulés & IA',
    description: 'Prépare et réussis ton TCF Canada en ligne. Examens simulés, corrections IA instantanées, calcul NCLC officiel. La plateforme #1 de la diaspora africaine au Canada.',
    locale: 'fr_CA',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'RéussirTCF — Préparation TCF Canada en ligne' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RéussirTCF — Préparation TCF Canada en ligne',
    description: 'Examens simulés, corrections IA, calcul NCLC. La plateforme de la diaspora africaine au Canada.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'RéussirTCF',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
      },
      sameAs: [],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'frranklinlontsi99@gmail.com',
        availableLanguage: ['French'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'RéussirTCF',
      description: 'Plateforme de préparation au TCF Canada pour la diaspora africaine',
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
      inLanguage: 'fr-CA',
    },
    {
      '@type': 'EducationalOrganization',
      '@id': `${SITE_URL}/#edu`,
      name: 'RéussirTCF',
      url: SITE_URL,
      description: 'Préparation au TCF Canada en ligne — examens simulés, corrections IA, calcul NCLC officiel.',
      educationalCredentialAwarded: 'Certification de niveau TCF Canada',
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Formations TCF Canada',
        itemListElement: [
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Course',
              name: 'Compréhension Orale & Écrite — TCF Canada',
              description: 'Entraînement compréhension orale et écrite TCF Canada avec 39 questions chacune.',
              provider: { '@id': `${SITE_URL}/#edu` },
              inLanguage: 'fr-CA',
            },
          },
          {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Course',
              name: 'Expression Orale & Écrite — TCF Canada',
              description: 'Sujets expression orale et écrite avec corrections IA instantanées.',
              provider: { '@id': `${SITE_URL}/#edu` },
              inLanguage: 'fr-CA',
            },
          },
        ],
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={frFR}>
      <html lang="fr">
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
