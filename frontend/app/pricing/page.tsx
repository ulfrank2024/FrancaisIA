'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { trackEvent, EVENTS } from '../../lib/analytics';
import Link from 'next/link';
import Footer from '../../components/Footer';
import { useAuth } from '../../lib/auth-context';

const PLANS = [
  {
    id: 'bronze',
    name: 'Bronze',
    emoji: '🥉',
    price: '14,99 $',
    period: 'paiement unique',
    description: 'Pour découvrir la plateforme et tester vos bases.',
    color: 'from-orange-400 to-amber-500',
    border: 'border-amber-200',
    ring: 'ring-amber-400',
    ctaClass: 'bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white',
    features: [
      '✓ Accès à 1 section au choix (CO, CE, EE ou EO)',
      '✓ 10 sessions de pratique',
      '✓ Correction IA pour Expression Écrite',
      '✓ Résultats et scores détaillés',
      '✗ Sessions illimitées',
      '✗ Simulation examen complet',
      '✗ Accès prioritaire aux nouvelles épreuves',
    ],
    paymentLink: process.env.NEXT_PUBLIC_STRIPE_BRONZE_URL ?? '#',
    popular: false,
  },
  {
    id: 'silver',
    name: 'Silver',
    emoji: '🥈',
    price: '29,99 $',
    period: 'par mois',
    description: 'La solution complète pour une préparation sérieuse.',
    color: 'from-slate-400 to-slate-500',
    border: 'border-indigo-400',
    ring: 'ring-indigo-400',
    ctaClass: 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white',
    features: [
      '✓ Accès à toutes les sections (CO, CE, EE, EO)',
      '✓ Sessions illimitées',
      '✓ Correction IA avancée + feedback détaillé',
      '✓ Simulation examen complet TCF Canada',
      '✓ Suivi de progression et dashboard',
      '✓ Soumissions aux professeurs',
      '✗ Accès prioritaire aux nouvelles épreuves',
    ],
    paymentLink: process.env.NEXT_PUBLIC_STRIPE_SILVER_URL ?? '#',
    popular: true,
  },
  {
    id: 'gold',
    name: 'Gold',
    emoji: '🥇',
    price: '49,99 $',
    period: 'tous les 2 mois',
    description: 'L\'offre premium pour maximiser vos chances de succès.',
    color: 'from-yellow-400 to-amber-400',
    border: 'border-yellow-300',
    ring: 'ring-yellow-400',
    ctaClass: 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-900',
    features: [
      '✓ Tout le plan Silver inclus',
      '✓ Accès prioritaire aux nouvelles épreuves',
      '✓ Corrections de professeur en 48h',
      '✓ Sessions de groupe en direct (2/mois)',
      '✓ Ressources exclusives PDF et audio',
      '✓ Support prioritaire par WhatsApp',
      '✓ Attestation de préparation officielle',
    ],
    paymentLink: process.env.NEXT_PUBLIC_STRIPE_GOLD_URL ?? '#',
    popular: false,
  },
];

const FAQS = [
  { q: 'Puis-je annuler mon abonnement à tout moment ?', a: 'Oui, vous pouvez annuler Silver ou Gold à tout moment depuis votre tableau de bord. L\'accès reste actif jusqu\'à la fin de la période payée.' },
  { q: 'Le Bronze est-il remboursable ?', a: 'Oui, sous 14 jours après l\'achat si vous n\'avez pas utilisé plus de 3 sessions. Consultez notre politique de remboursement pour les détails.' },
  { q: 'Comment fonctionne le plan Gold (tous les 2 mois) ?', a: 'Vous êtes facturé 49,99 $CA toutes les 8 semaines. Cela revient à environ 25 $CA/mois — une économie par rapport au Silver mensuel.' },
  { q: 'Est-ce que la plateforme reconnaît mon niveau actuel ?', a: 'Oui, nos exercices couvrent les niveaux A2 à C1 du CECRL. Vous pouvez filtrer par niveau et suivre votre progression section par section.' },
  { q: 'Le paiement est-il sécurisé ?', a: 'Tous les paiements sont traités par Stripe, certifié PCI-DSS niveau 1. Nous ne stockons aucune donnée bancaire sur nos serveurs.' },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    trackEvent({ userId: user?.id, event: EVENTS.PRICING_VIEW, page: '/pricing' });
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-black text-slate-900">
            <span className="text-red-600">🍁</span>
            RéussirTCF
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-slate-500 hover:text-red-600 transition-colors font-medium hidden sm:block">Mon compte</Link>
            <Link href="/login" className="text-slate-500 hover:text-red-600 transition-colors font-medium">Connexion</Link>
            <Link href="/register" className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-full text-xs transition-colors">
              Essai gratuit
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white pt-20 pb-16 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold px-4 py-1.5 rounded-full mb-6">
            💎 Investis dans ton succès
          </span>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
            Nos <span className="bg-gradient-to-r text-red-600">Tarifs</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-xl mx-auto">
            Choisissez le plan adapté à votre objectif TCF Canada. Commencez gratuitement, évoluez selon vos besoins.
          </p>
        </motion.div>
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        {/* Gratuit */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl">🎁</div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-800">Plan Gratuit</h3>
                <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Toujours gratuit</span>
              </div>
              <p className="text-sm text-slate-500">3 sessions d&apos;essai par section · Résultats basiques · Chat IA limité</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <span className="text-3xl font-black text-slate-800">0 $</span>
            </div>
            <Link href="/register"
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all whitespace-nowrap">
              Commencer →
            </Link>
          </div>
        </motion.div>

        {/* 3 plans payants */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
              className={`relative bg-white rounded-2xl border-2 ${plan.border} overflow-hidden flex flex-col ${plan.popular ? `ring-2 ${plan.ring} shadow-xl` : 'shadow-sm'}`}>
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
              )}
              {plan.popular && (
                <div className="absolute top-4 right-4">
                  <span className="text-xs font-black bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-3 py-1 rounded-full">
                    ⭐ Populaire
                  </span>
                </div>
              )}

              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-xl shadow-sm`}>
                    {plan.emoji}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">{plan.name}</h3>
                    <p className="text-xs text-slate-500">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-sm text-slate-400 ml-2">{plan.period}</span>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className={`text-sm flex items-start gap-2 ${f.startsWith('✗') ? 'text-slate-300' : 'text-slate-600'}`}>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 pt-0">
                <a
                  href={user ? `${plan.paymentLink}?client_reference_id=${user.id}` : plan.paymentLink}
                  target="_blank" rel="noopener noreferrer"
                  className={`w-full py-3 rounded-xl font-black text-sm transition-all text-center block ${plan.ctaClass}`}>
                  Choisir {plan.name}
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Garantie */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-12 bg-gradient-to-br from-red-50 to-slate-50 border border-red-100 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🛡️</div>
          <h3 className="font-black text-slate-800 text-xl mb-2">Satisfait ou remboursé — 14 jours</h3>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Si RéussirTCF ne vous convient pas dans les 14 premiers jours, nous vous remboursons intégralement. Sans condition, sans question.
          </p>
        </motion.div>

        {/* Comparatif NCLC */}
        <div className="mt-16">
          <h2 className="text-2xl font-black text-slate-800 text-center mb-3">Quel score TCF viser ?</h2>
          <p className="text-slate-400 text-sm text-center mb-8">Correspondance NCLC — référence officielle d&apos;Immigration Canada</p>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-bold text-slate-600">Niveau NCLC</th>
                  <th className="px-4 py-3 text-center font-bold text-violet-600">CE</th>
                  <th className="px-4 py-3 text-center font-bold text-sky-600">CO</th>
                  <th className="px-4 py-3 text-center font-bold text-emerald-600">EE</th>
                  <th className="px-4 py-3 text-center font-bold text-rose-600">EO</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { nclc: '10+', ce: '549–699', co: '549–699', ee: '16–20', eo: '16–20' },
                  { nclc: '9',   ce: '524–548', co: '523–548', ee: '14–15', eo: '14–15' },
                  { nclc: '8',   ce: '499–523', co: '503–522', ee: '12–13', eo: '12–13' },
                  { nclc: '7',   ce: '453–498', co: '458–502', ee: '10–11', eo: '10–11' },
                  { nclc: '6',   ce: '406–452', co: '398–457', ee: '7–9',   eo: '7–9'  },
                ].map((row, i) => (
                  <tr key={row.nclc} className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                    <td className="px-4 py-3 font-black text-slate-800">NCLC {row.nclc}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{row.ce}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{row.co}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{row.ee}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{row.eo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16" id="faq">
          <h2 className="text-2xl font-black text-slate-800 text-center mb-8">Questions fréquentes</h2>
          <div className="max-w-2xl mx-auto space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-3">
                  <span className="font-bold text-slate-700 text-sm">{faq.q}</span>
                  <span className={`text-slate-400 transition-transform flex-shrink-0 ${openFaq === i ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === i && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="px-5 pb-4 text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-16 bg-gradient-to-br from-red-700 to-red-600 rounded-3xl p-10 text-center text-white">
          <h2 className="text-3xl font-black mb-3">Prêt à décrocher ton TCF ?</h2>
          <p className="text-red-200 mb-8">Rejoins plus de 2 000 apprenants qui se préparent avec RéussirTCF.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register"
              className="bg-white text-indigo-700 font-black px-8 py-4 rounded-2xl hover:bg-indigo-50 transition-all text-sm">
              Commencer gratuitement
            </Link>
            <Link href="/legal/contact"
              className="bg-white/10 border border-white/20 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all text-sm">
              Nous contacter
            </Link>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
