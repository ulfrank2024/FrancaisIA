import type { Metadata } from 'next';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { frFR } from '@clerk/localizations';

export const metadata: Metadata = {
  title: 'FrançaisIA — Prépare ton TCF Canada',
  description: 'Plateforme IA pour préparer le TCF Canada. Communauté Camerounaise & Diaspora.',
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
