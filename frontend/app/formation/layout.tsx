import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Formation TCF Canada — Compréhension Orale & Écrite',
  description: 'Entraîne-toi à la compréhension orale et écrite du TCF Canada. 39 questions officielles, audios, textes authentiques et corrections instantanées.',
  alternates: { canonical: '/formation' },
  openGraph: {
    title: 'Formation TCF Canada — Compréhension Orale & Écrite | RéussirTCF',
    description: 'Entraîne-toi à la compréhension orale et écrite du TCF Canada avec des questions officielles et des corrections IA.',
    url: '/formation',
  },
};

export default function FormationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
