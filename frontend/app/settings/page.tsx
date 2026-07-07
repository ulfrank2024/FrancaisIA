'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Spinner from '../../components/Spinner';
import Footer from '../../components/Footer';
import { useAuth } from '../../lib/auth-context';

type SectionCode = 'EE' | 'EO' | 'CE' | 'CO';
type PlanKey = 'free' | 'bronze' | 'silver' | 'gold';

const PLAN_DETAILS: Record<PlanKey, {
  label: string;
  badge: string;
  gradient: string;
  bg: string;
  border: string;
  textColor: string;
  duration: number | null;
  access: Record<SectionCode, {
    type: 'illimite' | 'limite';
    count: number | null;
    seriesCount: number | null;
    label: string;
    subLabel: string;
  }>;
}> = {
  free: {
    label: 'Gratuit', badge: 'GRATUIT',
    gradient: 'from-slate-400 to-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', textColor: 'text-slate-600',
    duration: null,
    access: {
      EE: { type: 'limite', count: 2,    seriesCount: null, label: 'Simulateur IA',     subLabel: 'Sessions d\'écriture' },
      EO: { type: 'limite', count: 2,    seriesCount: null, label: 'Sujets d\'actualités', subLabel: 'Sujets avec corrections' },
      CE: { type: 'limite', count: null, seriesCount: 3,    label: 'Séries de quiz',    subLabel: 'Séries disponibles' },
      CO: { type: 'limite', count: null, seriesCount: 3,    label: 'Séries d\'écoute',  subLabel: 'Séries disponibles' },
    },
  },
  bronze: {
    label: 'Bronze', badge: 'BRONZE',
    gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', border: 'border-amber-200', textColor: 'text-amber-700',
    duration: 5,
    access: {
      EE: { type: 'limite', count: 15,   seriesCount: null, label: 'Simulateur IA',     subLabel: 'Sessions d\'écriture' },
      EO: { type: 'limite', count: 15,   seriesCount: null, label: 'Sujets d\'actualités', subLabel: 'Sujets avec corrections' },
      CE: { type: 'limite', count: null, seriesCount: 10,   label: 'Séries de quiz',    subLabel: 'Séries disponibles' },
      CO: { type: 'limite', count: null, seriesCount: 10,   label: 'Séries d\'écoute',  subLabel: 'Séries disponibles' },
    },
  },
  silver: {
    label: 'Silver', badge: 'SILVER',
    gradient: 'from-slate-400 to-slate-600', bg: 'bg-slate-50', border: 'border-slate-300', textColor: 'text-slate-700',
    duration: 30,
    access: {
      EE: { type: 'illimite', count: null, seriesCount: null, label: 'Simulateur IA',     subLabel: 'Accès illimité à la correction IA' },
      EO: { type: 'illimite', count: null, seriesCount: null, label: 'Sujets d\'actualités', subLabel: 'Tous les sujets avec corrections' },
      CE: { type: 'illimite', count: null, seriesCount: 40,   label: 'Séries de quiz',    subLabel: 'Séries disponibles' },
      CO: { type: 'illimite', count: null, seriesCount: 40,   label: 'Séries d\'écoute',  subLabel: 'Séries disponibles' },
    },
  },
  gold: {
    label: 'Gold', badge: 'GOLD',
    gradient: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-50', border: 'border-yellow-200', textColor: 'text-yellow-700',
    duration: 60,
    access: {
      EE: { type: 'illimite', count: null, seriesCount: null, label: 'Simulateur IA',     subLabel: 'Accès illimité à la correction IA' },
      EO: { type: 'illimite', count: null, seriesCount: null, label: 'Sujets d\'actualités', subLabel: 'Tous les sujets avec corrections' },
      CE: { type: 'illimite', count: null, seriesCount: 40,   label: 'Séries de quiz',    subLabel: 'Séries disponibles' },
      CO: { type: 'illimite', count: null, seriesCount: 40,   label: 'Séries d\'écoute',  subLabel: 'Séries disponibles' },
    },
  },
};

const SECTION_META: Record<SectionCode, { icon: string; label: string; href: string; gradient: string; bg: string; iconBg: string }> = {
  EE: { icon: '✍️', label: 'Expression Écrite',    href: '/practice/EE', gradient: 'from-emerald-500 to-teal-500',   bg: 'bg-emerald-50', iconBg: 'from-emerald-400 to-teal-500' },
  EO: { icon: '🎤', label: 'Expression Orale',     href: '/practice/EO', gradient: 'from-rose-500 to-pink-500',      bg: 'bg-rose-50',    iconBg: 'from-rose-400 to-pink-500' },
  CE: { icon: '📖', label: 'Compréhension Écrite', href: '/practice/CE', gradient: 'from-violet-500 to-purple-500',  bg: 'bg-violet-50',  iconBg: 'from-violet-400 to-purple-500' },
  CO: { icon: '🎧', label: 'Compréhension Orale',  href: '/practice/CO', gradient: 'from-sky-500 to-cyan-500',       bg: 'bg-sky-50',     iconBg: 'from-sky-400 to-cyan-500' },
};

const NAV_SECTIONS: { code: SectionCode; label: string }[] = [
  { code: 'EE', label: 'Expression écrite' },
  { code: 'EO', label: 'Expression orale' },
  { code: 'CE', label: 'Compréhension écrite' },
  { code: 'CO', label: 'Compréhension orale' },
];

function daysRemaining(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));
}
function daysElapsed(startDate: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000));
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-CA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { logout } = useAuth();
  const [examDate, setExamDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  type UserMeta = {
    plan?: PlanKey; subscriptionStart?: string; subscriptionEnd?: string; examDate?: string;
    role?: string;
  };

  const meta = (user?.unsafeMetadata ?? {}) as UserMeta;
  const plan = (meta.plan ?? 'free') as PlanKey;
  const planInfo = PLAN_DETAILS[plan];

  const [localExamDate, setLocalExamDate] = useState(meta.examDate ?? '');

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size={36} />
      </div>
    );
  }

  async function handleSaveExamDate() {
    setSaving(true); setSaved(false);
    try {
      await user?.update({ unsafeMetadata: { ...meta, examDate: localExamDate } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  const subStart = meta.subscriptionStart;
  const subEnd = meta.subscriptionEnd;
  const remaining = subEnd ? daysRemaining(subEnd) : null;
  const elapsed = subStart ? daysElapsed(subStart) : null;
  const totalDays = planInfo.duration;
  const progressPct = (subStart && subEnd && totalDays)
    ? Math.min(100, Math.round(((elapsed ?? 0) / totalDays) * 100))
    : 0;
  const isActive = subEnd ? new Date(subEnd) > new Date() : plan === 'free';
  const daysToExam = localExamDate ? daysRemaining(localExamDate) : null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">

      {/* ══════════════════════════════════════════════════════════
          NAVIGATION PRINCIPALE
      ══════════════════════════════════════════════════════════ */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        {/* Barre du haut */}
        <div className="border-b border-slate-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 font-black text-lg flex-shrink-0">
              <span className="text-red-600 text-xl">🍁</span>
              <span className="text-slate-900 hidden sm:block">RéussirTCF</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-500">
              <Link href="/formation" className="hover:text-slate-800 transition-colors uppercase tracking-wide text-xs">Formations</Link>
              <Link href="/pricing" className="hover:text-slate-800 transition-colors uppercase tracking-wide text-xs">Tarifs</Link>
              <Link href="/legal/contact" className="hover:text-slate-800 transition-colors uppercase tracking-wide text-xs">Contactez-nous</Link>
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <img
                  src={user?.imageUrl || `https://api.dicebear.com/9.x/personas/svg?seed=${user?.id}`}
                  className="w-8 h-8 rounded-full border border-slate-200"
                  alt="Avatar"
                />
                <span className="text-sm font-semibold text-slate-700 max-w-[120px] truncate">
                  {user?.firstName ?? 'Compte'}
                </span>
              </div>
              <button
                onClick={() => { logout(); router.push('/'); }}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium hidden sm:block">
                Déconnexion
              </button>
              <button
                onClick={() => setMobileNavOpen(v => !v)}
                className="md:hidden text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                {mobileNavOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {/* Barre des sections */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2">
            <Link href="/dashboard"
              className="flex-shrink-0 text-xs font-semibold text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors">
              Accueil
            </Link>
            <span className="text-slate-200 flex-shrink-0">|</span>
            {NAV_SECTIONS.map(s => (
              <Link key={s.code} href={`/practice/${s.code}`}
                className="flex-shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors whitespace-nowrap">
                {s.label}
              </Link>
            ))}
            <span className="text-slate-200 flex-shrink-0">|</span>
            <Link href="/settings"
              className="flex-shrink-0 text-xs font-bold text-red-600 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 whitespace-nowrap">
              Mon compte
            </Link>
          </div>
        </div>

        {/* Menu mobile */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-slate-100 bg-white overflow-hidden">
              <div className="px-4 py-3 space-y-1">
                <Link href="/dashboard" onClick={() => setMobileNavOpen(false)} className="block text-sm font-semibold text-slate-700 py-2 px-3 rounded-xl hover:bg-slate-50">🏠 Accueil</Link>
                {NAV_SECTIONS.map(s => (
                  <Link key={s.code} href={`/practice/${s.code}`} onClick={() => setMobileNavOpen(false)}
                    className="block text-sm font-semibold text-slate-700 py-2 px-3 rounded-xl hover:bg-slate-50">
                    {SECTION_META[s.code].icon} {s.label}
                  </Link>
                ))}
                <button onClick={() => { logout(); router.push('/'); }} className="w-full text-left text-sm font-semibold text-red-500 py-2 px-3 rounded-xl hover:bg-red-50">
                  ↪ Déconnexion
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ══════════════════════════════════════════════════════════
          CONTENU
      ══════════════════════════════════════════════════════════ */}
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

          {/* En-tête de page */}
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard" className="text-slate-400 hover:text-red-600 transition-colors text-sm flex items-center gap-1 font-medium">
              ← Retour
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Mon Compte</h1>
            <p className="text-slate-500 text-sm mt-0.5">Gérez votre abonnement et vos accès</p>
          </div>

          {/* ── Actions rapides ─────────────────────────────── */}
          <div>
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Actions rapides</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: '👤', label: 'Mon profil', sub: 'Modifier mes informations',
                  action: () => window.open('https://accounts.clerk.com/user', '_blank'),
                },
                {
                  icon: '🔒', label: 'Sécurité', sub: 'Changer mon mot de passe',
                  action: () => window.open('https://accounts.clerk.com/user/security', '_blank'),
                },
                {
                  icon: '💬', label: 'Support', sub: 'Nous contacter',
                  action: () => window.open('mailto:contact@reussir-tcf.ca', '_blank'),
                },
              ].map((item, i) => (
                <motion.button key={i} whileHover={{ y: -2 }} onClick={item.action}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center hover:shadow-md hover:border-red-100 transition-all">
                  <div className="text-2xl mb-1.5">{item.icon}</div>
                  <div className="text-xs font-black text-slate-800 leading-tight">{item.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5 leading-tight">{item.sub}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* ── Mon abonnement ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-800">Mon abonnement</h2>
              {plan === 'free' && (
                <Link href="/pricing"
                  className="text-xs font-black bg-gradient-to-r from-red-600 to-rose-500 text-white px-3 py-1.5 rounded-xl shadow hover:shadow-md transition-all">
                  Passer Premium →
                </Link>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Plan + statut */}
              <div className="flex items-center gap-3">
                <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${planInfo.gradient} text-white text-sm font-black shadow`}>
                  {planInfo.badge}
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {isActive ? '● Actif' : '● Inactif'}
                </span>
              </div>

              {/* Grid dates (4 cellules) */}
              {plan !== 'free' && subStart && subEnd ? (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Début', value: formatDate(subStart) },
                    { label: 'Fin', value: formatDate(subEnd) },
                    { label: 'Restant', value: remaining !== null ? `${remaining}j` : '—' },
                    { label: 'Durée', value: totalDays ? `${totalDays} jours` : '—' },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                      <div className="text-xs text-slate-400 mb-0.5">{item.label}</div>
                      <div className="font-black text-slate-800 text-xs sm:text-sm">{item.value}</div>
                    </div>
                  ))}
                </div>
              ) : plan === 'free' ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
                  <span className="font-bold">Plan gratuit</span> — Accès limité. Passe à Silver ou Gold pour un accès illimité.
                </div>
              ) : null}

              {/* Barre de progression */}
              {plan !== 'free' && totalDays && (
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Progression</span>
                    <span className="font-bold text-slate-600">{progressPct}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className={`h-full rounded-full bg-gradient-to-r ${planInfo.gradient}`}
                    />
                  </div>
                </div>
              )}

              {/* Date d'examen */}
              <div className="border-t border-slate-50 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold text-slate-700">Date d&apos;examen TCF</div>
                    <div className="text-xs text-slate-400">
                      {localExamDate
                        ? new Date(localExamDate).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })
                        : 'Non définie'}
                    </div>
                  </div>
                  {daysToExam !== null && daysToExam <= 30 && (
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                      ⚠️ {daysToExam}j
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={localExamDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setLocalExamDate(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                  />
                  <button
                    onClick={handleSaveExamDate}
                    disabled={!localExamDate || saving}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap">
                    {saving ? <Spinner size={14} color="#fff" /> : saved ? '✓ Sauvé' : 'Sauver'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Vos accès inclus ────────────────────────────── */}
          <div>
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Vos accès inclus</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['EE', 'EO', 'CE', 'CO'] as SectionCode[]).map((code, i) => {
                const sm = SECTION_META[code];
                const access = planInfo.access[code];
                const isIllimite = access.type === 'illimite';

                return (
                  <motion.div
                    key={code}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.04 }}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">

                    {/* En-tête section */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sm.iconBg} flex items-center justify-center text-lg shadow flex-shrink-0`}>
                        {sm.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-slate-800 text-sm leading-tight">{sm.label}</div>
                        <div className="text-xs text-slate-500">{access.label}</div>
                      </div>
                    </div>

                    {/* Contenu accès */}
                    {isIllimite ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-xs font-bold text-emerald-600">Accès illimité</span>
                        </div>
                        {access.seriesCount ? (
                          <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between border border-slate-100">
                            <span className="text-xs text-slate-500">{access.subLabel}</span>
                            <span className="font-black text-slate-800 text-sm">{access.seriesCount}<span className="text-xs text-slate-400 font-normal ml-1">séries</span></span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">{access.subLabel}</div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-amber-400 rounded-full" />
                          <span className="text-xs font-bold text-amber-600">Accès limité</span>
                        </div>
                        {access.count !== null ? (
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {[
                              { label: 'Disponibles', value: access.count, color: 'text-slate-800' },
                              { label: 'Utilisés',    value: 0,            color: 'text-slate-400' },
                              { label: 'Restants',    value: access.count, color: 'text-red-600' },
                            ].map(item => (
                              <div key={item.label} className="bg-slate-50 rounded-xl py-2.5 border border-slate-100">
                                <div className={`text-lg font-black ${item.color}`}>{item.value}</div>
                                <div className="text-xs text-slate-400">{item.label}</div>
                              </div>
                            ))}
                          </div>
                        ) : access.seriesCount !== null ? (
                          <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between border border-slate-100">
                            <span className="text-xs text-slate-500">{access.subLabel}</span>
                            <span className="font-black text-slate-800 text-sm">{access.seriesCount}<span className="text-xs text-slate-400 font-normal ml-1">séries</span></span>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Bouton pratiquer */}
                    <Link href={sm.href}
                      className={`mt-4 block w-full text-center text-xs font-bold py-2.5 rounded-xl transition-all
                        ${isIllimite
                          ? `bg-gradient-to-r ${sm.gradient} text-white shadow hover:shadow-md`
                          : 'bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-700 border border-slate-200'}`}>
                      Pratiquer →
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── Plan gratuit : upgrade CTA ───────────────────── */}
          {plan === 'free' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl p-5 text-white text-center shadow-lg">
              <div className="text-lg font-black mb-1">Passe à Silver ou Gold</div>
              <div className="text-sm text-white/80 mb-4">Accès illimité à toutes les sections + corrections IA</div>
              <Link href="/pricing"
                className="inline-block bg-white text-red-600 font-black px-6 py-2.5 rounded-xl shadow hover:shadow-md transition-all text-sm">
                Voir les tarifs →
              </Link>
            </motion.div>
          )}

        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <Footer />
    </div>
  );
}
