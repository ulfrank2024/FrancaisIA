import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tarifs — Préparation TCF Canada',
  description: 'Choisissez votre formule RéussirTCF : accès gratuit ou abonnement complet. Examens simulés, corrections IA, calcul NCLC. Sans engagement.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Tarifs RéussirTCF — Préparation TCF Canada',
    description: 'Formule gratuite ou abonnement complet. Examens simulés, corrections IA, calcul NCLC officiel.',
    url: '/pricing',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
