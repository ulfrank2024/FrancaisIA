'use client';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400">
      {/* Bande drapeau */}
      <div className="flex h-1 w-full">
        <div className="w-1/4 bg-red-600" />
        <div className="w-1/2 bg-white/10" />
        <div className="w-1/4 bg-red-600" />
      </div>

      {/* Main */}
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="md:col-span-1">
          <Link href="/" className="flex items-center gap-2 font-black text-xl">
            <span className="text-red-500">🍁</span>
            <span className="text-white">RéussirTCF</span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed">
            La plateforme IA #1 pour préparer le TCF Canada. Conçue pour la communauté camerounaise et la diaspora.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <a href="https://wa.me/15062536067" target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-green-500 flex items-center justify-center transition-all text-base" title="WhatsApp">
              💬
            </a>
            <a href="https://youtube.com/@reussirtcf" target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-600 flex items-center justify-center transition-all text-base" title="YouTube">
              ▶
            </a>
          </div>
          <div className="mt-5 space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span>📧</span>
              <a href="mailto:contact@reussirtcf.ca" className="hover:text-white transition-colors">contact@reussirtcf.ca</a>
            </div>
            <div className="flex items-center gap-2">
              <span>📞</span>
              <span>+1 506 253-6067</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📍</span>
              <span>Montréal, QC, Canada</span>
            </div>
          </div>
        </div>

        {/* Formation */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4">Formation</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/practice/CE" className="hover:text-white transition-colors">Compréhension Écrite</Link></li>
            <li><Link href="/practice/CO" className="hover:text-white transition-colors">Compréhension Orale</Link></li>
            <li><Link href="/practice/EE" className="hover:text-white transition-colors">Expression Écrite</Link></li>
            <li><Link href="/practice/EO" className="hover:text-white transition-colors">Expression Orale</Link></li>
            <li><Link href="/chat" className="hover:text-white transition-colors">Assistant IA Sophie</Link></li>
          </ul>
        </div>

        {/* Liens rapides */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4">Liens rapides</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/pricing" className="hover:text-white transition-colors">Tarifs</Link></li>
            <li><Link href="/dashboard" className="hover:text-white transition-colors">Tableau de bord</Link></li>
            <li><Link href="/legal/contact" className="hover:text-white transition-colors">Contact</Link></li>
            <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
          </ul>
        </div>

        {/* Légal */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4">Légal</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/legal/privacy" className="hover:text-white transition-colors">Confidentialité</Link></li>
            <li><Link href="/legal/terms" className="hover:text-white transition-colors">Conditions d&apos;utilisation</Link></li>
            <li><Link href="/legal/refund" className="hover:text-white transition-colors">Remboursement</Link></li>
            <li><Link href="/legal/accessibility" className="hover:text-white transition-colors">Accessibilité</Link></li>
            <li><Link href="/legal/cookies" className="hover:text-white transition-colors">Cookies</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span>© {new Date().getFullYear()} RéussirTCF Inc. Tous droits réservés. 🍁</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span>Tous les services sont opérationnels</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
