'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  icon: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, subtitle, icon, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-black bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
            FrançaisIA
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-slate-500 hover:text-indigo-600 transition-colors font-medium">Connexion</Link>
            <Link href="/register" className="bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold px-4 py-2 rounded-full text-xs hover:opacity-90 transition-opacity">
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white py-16 px-6">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-5xl mb-4">{icon}</div>
          <h1 className="text-4xl font-black mb-3">{title}</h1>
          <p className="text-slate-400 text-lg">{subtitle}</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs text-slate-300">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            Dernière mise à jour : {lastUpdated}
          </div>
        </motion.div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-slate-50 border-b border-slate-100 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs text-slate-400">
          <Link href="/" className="hover:text-indigo-600 transition-colors">Accueil</Link>
          <span>›</span>
          <span className="text-slate-600">{title}</span>
        </div>
      </div>

      {/* Contenu */}
      <motion.div
        className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-14"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="prose prose-slate max-w-none">
          {children}
        </div>
      </motion.div>

      {/* Footer minimal */}
      <div className="bg-slate-950 text-slate-500 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <Link href="/" className="font-black text-base bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            FrançaisIA
          </Link>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/legal/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="/legal/terms" className="hover:text-white transition-colors">Conditions</Link>
            <Link href="/legal/refund" className="hover:text-white transition-colors">Remboursement</Link>
            <Link href="/legal/accessibility" className="hover:text-white transition-colors">Accessibilité</Link>
            <Link href="/legal/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
          <span>© {new Date().getFullYear()} FrançaisIA Inc.</span>
        </div>
      </div>
    </div>
  );
}
