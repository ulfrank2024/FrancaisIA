import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Formation TCF Canada — Expression Orale & Écrite',
  description: 'Prépare-toi à l\'expression orale et écrite du TCF Canada. Sujets authentiques, corrections IA instantanées et feedback personnalisé pour maximiser ton score.',
  alternates: { canonical: '/formation-eo' },
  openGraph: {
    title: 'Formation TCF Canada — Expression Orale & Écrite | RéussirTCF',
    description: 'Sujets expression orale et écrite TCF Canada avec corrections IA instantanées et feedback personnalisé.',
    url: '/formation-eo',
  },
};

export default function FormationEoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
