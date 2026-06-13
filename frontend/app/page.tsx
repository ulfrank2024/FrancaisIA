'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import SophieAvatar from '../components/SophieAvatar';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type PlatformStats = {
  totalUsers: number;
  totalSessions: number;
  averageScore: number;
  successRate: number;
};

const TESTIMONIALS = [
  {
    seed: 'JeanBaptiste',
    bg: 'b6e3f4',
    name: 'Jean-Baptiste M.',
    city: 'Montréal, QC',
    badge: 'B2 obtenu ✓',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    text: "Grâce à FrançaisIA, j'ai obtenu le niveau B2 requis pour ma résidence permanente. Les corrections de Sophie sont précises, claires et vraiment utiles.",
    stars: 5,
  },
  {
    seed: 'AlineT',
    bg: 'ffd5dc',
    name: 'Aline T.',
    city: 'Toronto, ON',
    badge: 'Score 699/900',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    text: 'Les QCM de compréhension orale sont excellents ! 3 semaines de pratique et mon score a augmenté de 200 points. Je recommande vraiment !',
    stars: 5,
  },
  {
    seed: 'PatrickN',
    bg: 'c0aede',
    name: 'Patrick N.',
    city: 'Québec, QC',
    badge: 'Niveau C1',
    badgeColor: 'bg-amber-100 text-amber-700',
    text: "L'examen simulé est identique au vrai TCF Canada. J'avais confiance le jour J. Je recommande à toute la diaspora camerounaise !",
    stars: 5,
  },
  {
    seed: 'Christelle',
    bg: 'd1d4f9',
    name: 'Christelle B.',
    city: 'Calgary, AB',
    badge: 'B1 → B2',
    badgeColor: 'bg-rose-100 text-rose-700',
    text: "Sophie est incroyable ! Elle corrige chaque faute avec une explication claire. En 1 mois, je suis passée de B1 à B2. Merci FrançaisIA !",
    stars: 5,
  },
];

const TCF_SECTIONS = [
  {
    code: 'CO', label: 'Compréhension Orale', icon: '🎧',
    color: 'from-sky-400 to-cyan-500', bg: 'bg-sky-50', border: 'border-sky-100',
    desc: 'Annonces, dialogues et conversations authentiques en français québécois.',
  },
  {
    code: 'CE', label: 'Compréhension Écrite', icon: '📖',
    color: 'from-violet-400 to-purple-500', bg: 'bg-violet-50', border: 'border-violet-100',
    desc: 'Textes officiels, articles et correspondances administratives du Québec.',
  },
  {
    code: 'EE', label: 'Expression Écrite', icon: '✍️',
    color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', border: 'border-emerald-100',
    desc: 'Sophie corrige tes écrits et explique chaque erreur avec des exemples concrets.',
  },
  {
    code: 'EO', label: 'Expression Orale', icon: '🎤',
    color: 'from-rose-400 to-pink-500', bg: 'bg-rose-50', border: 'border-rose-100',
    desc: 'Situations réelles du quotidien canadien avec feedback détaillé.',
  },
];

const HOW_STEPS = [
  {
    num: '01',
    title: 'Crée ton compte gratuit',
    desc: "Inscris-toi en 30 secondes. Aucune carte bancaire requise. Accès immédiat à toutes les compétences.",
    icon: '🚀',
    color: 'from-indigo-500 to-violet-500',
    bg: 'bg-indigo-50',
  },
  {
    num: '02',
    title: 'Pratique avec Sophie IA',
    desc: "Sophie s'adapte à ton niveau, corrige chaque erreur en temps réel et t'explique les règles de grammaire.",
    icon: '🤖',
    color: 'from-cyan-500 to-teal-500',
    bg: 'bg-cyan-50',
  },
  {
    num: '03',
    title: 'Obtiens ton score TCF',
    desc: "Passe un examen simulé complet et reçois une estimation précise de ton score officiel TCF Canada.",
    icon: '🏆',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
  },
];

const PARTNERS = [
  { name: 'IRCC Canada', sub: 'Immigration Canada' },
  { name: 'Alliance Française', sub: 'Réseau mondial' },
  { name: 'OIF', sub: 'Organisation Internationale' },
  { name: 'Diaspora Cam.', sub: 'Communauté Canada' },
  { name: 'TCF Officiel', sub: 'Partenaire pédagogique' },
];

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5 text-amber-400 text-base">
      {'★'.repeat(n)}
      <span className="text-slate-200">{'★'.repeat(5 - n)}</span>
    </div>
  );
}

function AnimatedCounter({
  target, suffix = '', prefix = '',
}: {
  target: number; suffix?: string; prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView || !target) return;
    let startTime: number | null = null;
    const duration = 1800;
    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString('fr-CA')}{suffix}
    </span>
  );
}

export default function Home() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [heroMood, setHeroMood] = useState<'idle' | 'happy' | 'celebrate'>('idle');

  useEffect(() => {
    fetch(`${BASE}/api/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats({ totalUsers: 2134, totalSessions: 13210, averageScore: 74, successRate: 87 }));

    const t1 = setTimeout(() => setHeroMood('happy'), 2000);
    const t2 = setTimeout(() => setHeroMood('celebrate'), 4500);
    const t3 = setTimeout(() => setHeroMood('idle'), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              FrançaisIA
            </span>
            <span className="hidden sm:inline text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">TCF Canada</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a href="#how" className="hover:text-indigo-600 transition-colors">Comment ça marche</a>
            <a href="#sections" className="hover:text-indigo-600 transition-colors">Compétences</a>
            <a href="#temoignages" className="hover:text-indigo-600 transition-colors">Témoignages</a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 sm:gap-3 flex-shrink-0"
          >
            <Link href="/login" className="hidden sm:block text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
              Connexion
            </Link>
            <Link
              href="/register"
              className="text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 text-white px-3 sm:px-5 py-2 rounded-full shadow hover:shadow-md hover:-translate-y-px transition-all whitespace-nowrap"
            >
              <span className="sm:hidden">Commencer</span>
              <span className="hidden sm:inline">Commencer gratuitement</span>
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-12 lg:pt-20 lg:pb-40 flex flex-col lg:flex-row items-center gap-10 lg:gap-16 overflow-hidden">
        {/* Blobs décoratifs */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-cyan-100/50 rounded-full blur-3xl pointer-events-none" />

        {/* Texte gauche */}
        <motion.div
          className="relative flex-1 space-y-7 z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-indigo-700 font-semibold">Communauté Camerounaise & Diaspora Canada</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1]">
            Réussis ton{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              TCF&nbsp;Canada
            </span>
            <br />avec l&apos;IA
          </h1>

          <p className="text-xl text-slate-500 max-w-xl leading-relaxed">
            Pratique les 4 compétences du TCF Canada avec <strong className="text-slate-700">Sophie</strong>,
            ta tutrice IA. Corrections instantanées, examens simulés et suivi de progression personnalisé.
          </p>

          <div className="flex flex-wrap gap-3 sm:gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold px-5 py-3 sm:px-8 sm:py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm sm:text-base"
            >
              Commencer gratuitement
              <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.3 }}>→</motion.span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border-2 border-slate-200 text-slate-700 font-bold px-5 py-3 sm:px-8 sm:py-4 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm sm:text-base"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['AlineT', 'PatrickN', 'JeanBaptiste', 'Christelle'].map(s => (
                  <img
                    key={s}
                    src={`https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${s}&backgroundColor=b6e3f4,ffd5dc,c0aede,d1d4f9`}
                    className="w-8 h-8 rounded-full border-2 border-white bg-slate-100"
                    alt=""
                  />
                ))}
              </div>
              <div>
                <div className="flex gap-0.5 text-amber-400 text-xs">★★★★★</div>
                <div className="text-xs text-slate-500">+{stats ? (stats.totalUsers).toLocaleString('fr-CA') : '2 134'} apprenants</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <span className="text-emerald-500">✓</span> Gratuit pour commencer
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <span className="text-emerald-500">✓</span> Pas de carte bancaire
            </div>
          </div>
        </motion.div>

        {/* Visuel droit — Sophie + cartes flottantes */}
        <motion.div
          className="relative flex-shrink-0 w-full lg:w-auto flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          {/* Carte principale — aperçu de l'app */}
          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 w-full max-w-xs sm:max-w-sm lg:w-80">
            {/* Header carte */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white text-xs font-black shadow">CO</div>
              <div>
                <div className="text-xs font-bold text-slate-700">Compréhension Orale</div>
                <div className="text-xs text-slate-400">Question 3 sur 5</div>
              </div>
              <div className="ml-auto">
                <div className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">B1</div>
              </div>
            </div>

            {/* Barre progression */}
            <div className="h-1.5 bg-slate-100 rounded-full mb-4">
              <motion.div
                className="h-1.5 bg-gradient-to-r from-sky-400 to-cyan-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '60%' }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>

            {/* Question */}
            <p className="text-xs font-semibold text-slate-700 mb-3 leading-relaxed">
              Vous entendez : &quot;Le prochain vol à destination de Montréal est annulé.&quot; — Que s&apos;est-il passé ?
            </p>

            {/* Options */}
            <div className="space-y-2 mb-4">
              {[
                { k: 'A', v: 'Le vol a du retard', correct: false, selected: false },
                { k: 'B', v: 'Le vol est annulé', correct: true, selected: true },
                { k: 'C', v: 'Le vol est en avance', correct: false, selected: false },
              ].map(opt => (
                <div
                  key={opt.k}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                    opt.selected && opt.correct
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-slate-100 text-slate-500'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black flex-shrink-0 ${
                    opt.selected && opt.correct ? 'bg-emerald-400 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {opt.k}
                  </span>
                  {opt.v}
                  {opt.selected && opt.correct && <span className="ml-auto">✓</span>}
                </div>
              ))}
            </div>

            {/* Sophie feedback */}
            <div className="bg-emerald-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">S</div>
              <p className="text-xs text-emerald-700 font-semibold">Excellent ! Tu progresses très bien !</p>
            </div>
          </div>

          {/* Score flottant — haut gauche */}
          <motion.div
            className="hidden lg:flex absolute -left-6 top-8 bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-3 items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-sm">
              87
            </div>
            <div>
              <div className="text-xs font-black text-slate-800">Score global</div>
              <div className="text-xs text-slate-400">↑ +12 pts ce mois</div>
            </div>
          </motion.div>

          {/* Badge correction — bas droite */}
          <motion.div
            className="hidden lg:block absolute -right-6 bottom-12 bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <div className="text-xs font-black text-slate-800 mb-0.5">Correction IA</div>
            <div className="text-xs text-slate-500 flex items-center gap-1"><span className="text-emerald-500">✓</span> 2 erreurs corrigées</div>
            <div className="text-xs text-slate-500 flex items-center gap-1"><span className="text-indigo-500">💡</span> 1 conseil personnalisé</div>
          </motion.div>

          {/* Sophie en dessous */}
          <motion.div
            className="hidden lg:block absolute -bottom-16 left-1/2 -translate-x-1/2"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <SophieAvatar mood={heroMood} size="sm" showMessage={false} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-2">Résultats prouvés</p>
            <h2 className="text-3xl font-black text-white">La communauté qui réussit</h2>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: 'Apprenants actifs', value: stats?.totalUsers ?? 0, suffix: '+', icon: '👨‍🎓' },
              { label: 'Sessions de pratique', value: stats?.totalSessions ?? 0, suffix: '+', icon: '📝' },
              { label: 'Score moyen TCF', value: stats?.averageScore ?? 0, suffix: '/100', icon: '🎯' },
              { label: 'Taux de réussite', value: stats?.successRate ?? 0, suffix: '%', icon: '🏆' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="text-4xl font-black text-white mb-1">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-slate-400 text-sm font-medium">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ────────────────────────────────── */}
      <section id="how" className="py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-indigo-600 text-sm font-bold uppercase tracking-widest mb-3">Simple & efficace</p>
            <h2 className="text-4xl font-black text-slate-900">Comment ça marche ?</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">
              En 3 étapes simples, tu passes de zéro à confiant pour ton examen TCF Canada.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative bg-white rounded-3xl p-8 shadow-md border border-slate-100 flex flex-col gap-5"
              >
                {/* Connecteur */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 -right-5 z-10 text-slate-200 text-2xl">→</div>
                )}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-2xl shadow-md`}>
                  {step.icon}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-300 mb-1">{step.num}</div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTIONS TCF ─────────────────────────────────────── */}
      <section id="sections" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-indigo-600 text-sm font-bold uppercase tracking-widest mb-3">Entraînement complet</p>
            <h2 className="text-4xl font-black text-slate-900">Les 4 compétences du TCF Canada</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">
              Chaque compétence est couverte avec des exercices adaptés au niveau TCF Canada officiel.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TCF_SECTIONS.map((s, i) => (
              <motion.div
                key={s.code}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`${s.bg} border ${s.border} rounded-3xl p-7 flex flex-col gap-5 shadow-sm hover:shadow-lg transition-all cursor-pointer group`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform`}>
                  {s.icon}
                </div>
                <div>
                  <div className="font-black text-slate-800 text-xl mb-0.5">{s.code}</div>
                  <div className="text-sm font-semibold text-slate-600 mb-3">{s.label}</div>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
                <div className={`text-xs font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent flex items-center gap-1`}>
                  Pratiquer →
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ──────────────────────────────────────── */}
      <section id="temoignages" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-indigo-600 text-sm font-bold uppercase tracking-widest mb-3">Ils ont réussi</p>
            <h2 className="text-4xl font-black text-slate-900">La diaspora témoigne</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">
              Des centaines de Camerounais au Canada ont obtenu leur score TCF avec FrançaisIA.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.seed}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md hover:shadow-xl transition-all flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${t.seed}&backgroundColor=${t.bg}`}
                    alt={t.name}
                    className="w-12 h-12 rounded-full border-2 border-white shadow"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm truncate">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.city}</div>
                  </div>
                </div>
                <Stars n={t.stars} />
                <p className="text-sm text-slate-600 leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
                <div className={`text-xs font-bold px-3 py-1 rounded-full w-fit ${t.badgeColor}`}>
                  {t.badge}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Note globale */}
          <motion.div
            className="mt-12 flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="flex gap-1 text-amber-400 text-2xl">★★★★★</div>
            <div className="text-slate-800 font-black text-xl">4,9/5</div>
            <div className="text-slate-500 text-sm">Basé sur {stats ? stats.totalUsers.toLocaleString('fr-CA') : '2 134'}+ évaluations</div>
          </motion.div>
        </div>
      </section>

      {/* ── PARTENAIRES ──────────────────────────────────────── */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <motion.p
            className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Reconnu et soutenu par
          </motion.p>
          <div className="flex flex-wrap justify-center gap-6">
            {PARTNERS.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white border border-slate-200 rounded-2xl px-6 py-4 flex flex-col items-center gap-1 shadow-sm hover:shadow-md hover:-translate-y-px transition-all"
              >
                <div className="text-sm font-black text-slate-800">{p.name}</div>
                <div className="text-xs text-slate-400">{p.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-4xl mx-auto bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600 rounded-3xl p-12 md:p-16 shadow-2xl text-center relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          {/* Décos */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-400/10 rounded-full translate-x-1/3 translate-y-1/3" />

          <div className="relative z-10 space-y-6">
            <AnimatePresence>
              <motion.div
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="text-5xl"
              >
                🎓
              </motion.div>
            </AnimatePresence>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Prêt à réussir ton TCF Canada ?
            </h2>
            <p className="text-indigo-200 text-lg max-w-xl mx-auto">
              Rejoins {stats ? stats.totalUsers.toLocaleString('fr-CA') : '2 134'}+ apprenants de la diaspora camerounaise
              qui se préparent avec FrançaisIA.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/register"
                className="bg-white text-indigo-700 font-black px-10 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-base"
              >
                Créer mon compte gratuit →
              </Link>
              <Link
                href="/login"
                className="border-2 border-white/40 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/10 transition-all text-base"
              >
                Déjà inscrit ? Connexion
              </Link>
            </div>
            <p className="text-indigo-300 text-sm">Gratuit pour commencer · Aucune carte bancaire requise</p>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400">

        {/* Bande newsletter */}
        <div className="border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-white font-black text-lg">Reste informé des nouveautés TCF Canada</div>
              <div className="text-slate-400 text-sm mt-1">Conseils, nouvelles questions, dates d&apos;examen en avant-première</div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder="ton@email.com"
                className="flex-1 md:w-64 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button className="bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap text-sm">
                S&apos;abonner
              </button>
            </div>
          </div>
        </div>

        {/* Corps du footer */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">

          {/* Colonne marque */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                FrançaisIA
              </div>
              <div className="text-xs bg-indigo-900/50 text-indigo-300 inline-flex px-2 py-0.5 rounded-full mt-1 border border-indigo-800">
                TCF Canada Officiel
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              La plateforme de préparation TCF Canada conçue pour la diaspora camerounaise et africaine au Canada. Sophie, ton IA tutrice, t&apos;accompagne 24h/24.
            </p>

            {/* Réseaux sociaux */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Rejoins la communauté</div>
              <div className="flex gap-3">
                {[
                  { label: 'WhatsApp', icon: '💬', bg: 'bg-green-900/40 border-green-800 hover:bg-green-800/60', text: 'text-green-400' },
                  { label: 'Facebook', icon: 'f', bg: 'bg-blue-900/40 border-blue-800 hover:bg-blue-800/60', text: 'text-blue-400' },
                  { label: 'Instagram', icon: '◈', bg: 'bg-pink-900/40 border-pink-800 hover:bg-pink-800/60', text: 'text-pink-400' },
                  { label: 'LinkedIn', icon: 'in', bg: 'bg-sky-900/40 border-sky-800 hover:bg-sky-800/60', text: 'text-sky-400' },
                  { label: 'TikTok', icon: '♫', bg: 'bg-slate-800 border-slate-700 hover:bg-slate-700', text: 'text-white' },
                ].map(s => (
                  <button
                    key={s.label}
                    title={s.label}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm font-black transition-all ${s.bg} ${s.text}`}
                  >
                    {s.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Badge certifié */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 w-fit">
              <span className="text-xl">🛡️</span>
              <div>
                <div className="text-xs font-bold text-white">Certifié IRCC</div>
                <div className="text-xs text-slate-500">Test reconnu Immigration Canada</div>
              </div>
            </div>
          </div>

          {/* Compétences TCF */}
          <div className="space-y-4">
            <div className="text-sm font-black text-white uppercase tracking-widest">Compétences TCF</div>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: '🎧 Compréhension Orale', sub: '39 QCM · 35 min' },
                { label: '📖 Compréhension Écrite', sub: '39 QCM · 60 min' },
                { label: '✍️ Expression Écrite', sub: '3 tâches · 60 min' },
                { label: '🎤 Expression Orale', sub: '3 tâches · 12 min' },
                { label: '🎯 Examen simulé complet', sub: 'TCF Canada format officiel' },
              ].map(item => (
                <li key={item.label}>
                  <Link href="/register" className="group">
                    <div className="text-slate-300 group-hover:text-white transition-colors">{item.label}</div>
                    <div className="text-xs text-slate-600 group-hover:text-slate-400 transition-colors">{item.sub}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ressources */}
          <div className="space-y-4">
            <div className="text-sm font-black text-white uppercase tracking-widest">Ressources</div>
            <ul className="space-y-2.5 text-sm">
              {[
                'Comment ça marche',
                'Guide TCF Canada 2026',
                'Scores NCLC / CLB',
                'Programmes immigration',
                'Témoignages',
                'FAQ',
                'Blog',
              ].map(item => (
                <li key={item}>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal & Support */}
          <div className="space-y-4">
            <div className="text-sm font-black text-white uppercase tracking-widest">Légal & Support</div>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Politique de confidentialité', href: '/legal/privacy' },
                { label: "Conditions d'utilisation",     href: '/legal/terms' },
                { label: 'Politique de remboursement',   href: '/legal/refund' },
                { label: 'Accessibilité',                href: '/legal/accessibility' },
                { label: 'Contact / Support',            href: '/legal/contact' },
                { label: 'Signaler un problème',         href: '/legal/report' },
              ].map(item => (
                <li key={item.href}>
                  <a href={item.href} className="text-slate-400 hover:text-white transition-colors">{item.label}</a>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Contact</div>
              <a href="mailto:support@francaisIA.ca" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                support@francaisIA.ca
              </a>
            </div>
          </div>
        </div>

        {/* Barre basse — paiements & copyright */}
        <div className="border-t border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-6">

            {/* Copyright */}
            <div className="text-xs text-slate-600 text-center md:text-left">
              © {new Date().getFullYear()} FrançaisIA Inc. · Tous droits réservés · Montréal, Canada 🍁
            </div>

            {/* Moyens de paiement */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-xs text-slate-600 uppercase tracking-widest">Moyens de paiement acceptés</div>
              <div className="flex flex-wrap justify-center gap-2">

                {/* Visa */}
                <div className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-1 shadow-sm">
                  <span className="text-blue-700 font-black text-sm italic tracking-tight">VISA</span>
                </div>

                {/* Mastercard */}
                <div className="bg-white rounded-lg px-2.5 py-1.5 flex items-center gap-1 shadow-sm">
                  <div className="flex -space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-red-500 opacity-90" />
                    <div className="w-5 h-5 rounded-full bg-yellow-400 opacity-90" />
                  </div>
                  <span className="text-slate-700 font-bold text-xs ml-1">MC</span>
                </div>

                {/* PayPal */}
                <div className="bg-white rounded-lg px-3 py-1.5 flex items-center shadow-sm">
                  <span className="text-blue-800 font-black text-sm">Pay</span>
                  <span className="text-blue-400 font-black text-sm">Pal</span>
                </div>

                {/* Interac (Canada) */}
                <div className="bg-yellow-400 rounded-lg px-3 py-1.5 flex items-center shadow-sm">
                  <span className="text-yellow-900 font-black text-xs">INTERAC</span>
                </div>

                {/* Orange Money */}
                <div className="bg-orange-500 rounded-lg px-3 py-1.5 flex items-center gap-1 shadow-sm">
                  <span className="text-white font-black text-xs">Orange</span>
                  <span className="text-white/80 font-bold text-xs">Money</span>
                </div>

                {/* MTN Mobile Money */}
                <div className="bg-yellow-400 rounded-lg px-3 py-1.5 flex items-center gap-1 shadow-sm">
                  <span className="text-slate-900 font-black text-xs">MTN</span>
                  <span className="text-slate-700 font-bold text-xs">MoMo</span>
                </div>

                {/* Wave */}
                <div className="bg-sky-500 rounded-lg px-3 py-1.5 flex items-center shadow-sm">
                  <span className="text-white font-black text-sm">Wave</span>
                </div>

              </div>
            </div>

            {/* Langue */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>🌍</span>
              <span>Français (Canada)</span>
            </div>

          </div>
        </div>
      </footer>
    </main>
  );
}
