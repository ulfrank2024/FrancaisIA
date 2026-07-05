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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={frFR}>
      <html lang="fr">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
