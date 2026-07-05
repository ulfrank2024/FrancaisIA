'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import NewsletterForm from '../components/NewsletterForm';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type PlatformStats = {
  totalUsers: number;
  totalSessions: number;
  averageScore: number;
  successRate: number;
};

const NCLC_TABLE = [
  { nclc: '10+', ce: [549, 699], ee: [16, 20], co: [549, 699], eo: [16, 20] },
  { nclc: '9',   ce: [524, 548], ee: [14, 15], co: [523, 548], eo: [14, 15] },
  { nclc: '8',   ce: [499, 523], ee: [12, 13], co: [503, 522], eo: [12, 13] },
  { nclc: '7',   ce: [453, 498], ee: [10, 11], co: [458, 502], eo: [10, 11] },
  { nclc: '6',   ce: [406, 452], ee: [7, 9],   co: [398, 457], eo: [7, 9]  },
  { nclc: '5',   ce: [375, 405], ee: [6, 6],   co: [369, 397], eo: [6, 6]  },
  { nclc: '4',   ce: [342, 374], ee: [4, 5],   co: [331, 368], eo: [4, 5]  },
];

function getNclc(score: number, scale: 699 | 20, section: 'ce' | 'ee' | 'co' | 'eo'): number | null {
  for (const row of NCLC_TABLE) {
    const [min, max] = row[section];
    if (score >= min && score <= max) return parseInt(row.nclc);
  }
  return null;
}

const TESTIMONIALS = [
  { seed: 'JeanBaptiste', name: 'Jean-Baptiste M.', city: 'Montréal, QC', badge: 'B2 obtenu ✓', badgeColor: 'bg-emerald-100 text-emerald-700', text: "Grâce à RéussirTCF, j'ai obtenu le niveau B2 requis pour ma résidence permanente. Les corrections de Sophie sont précises et vraiment utiles.", stars: 5 },
  { seed: 'AlineT', name: 'Aline T.', city: 'Toronto, ON', badge: 'Score 699/900', badgeColor: 'bg-red-100 text-red-700', text: 'Les QCM de compréhension orale sont excellents ! 3 semaines de pratique et mon score a augmenté de 200 points. Je recommande !', stars: 5 },
  { seed: 'PatrickN', name: 'Patrick N.', city: 'Québec, QC', badge: 'Niveau C1', badgeColor: 'bg-amber-100 text-amber-700', text: "L'examen simulé est identique au vrai TCF Canada. J'avais confiance le jour J. Je recommande à toute la diaspora camerounaise !", stars: 5 },
  { seed: 'Christelle', name: 'Christelle B.', city: 'Calgary, AB', badge: 'B1 → B2', badgeColor: 'bg-rose-100 text-rose-700', text: "Sophie est incroyable ! Elle corrige chaque faute avec une explication claire. En 1 mois, je suis passée de B1 à B2. Merci RéussirTCF !", stars: 5 },
];

const TCF_SECTIONS = [
  { code: 'CO', label: 'Compréhension Orale', icon: '🎧', color: 'from-sky-400 to-cyan-500', bg: 'bg-sky-50', border: 'border-sky-200', questions: 39, duration: '35 min', desc: 'Dialogues, annonces et documents audio authentiques.' },
  { code: 'CE', label: 'Compréhension Écrite', icon: '📖', color: 'from-violet-400 to-purple-500', bg: 'bg-violet-50', border: 'border-violet-200', questions: 39, duration: '60 min', desc: 'Textes officiels, articles et correspondances canadiennes.' },
  { code: 'EE', label: 'Expression Écrite', icon: '✍️', color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', border: 'border-emerald-200', questions: 3, duration: '60 min', desc: 'Sophie corrige tes écrits avec des explications claires.', taches: true },
  { code: 'EO', label: 'Expression Orale', icon: '🎤', color: 'from-rose-400 to-pink-500', bg: 'bg-rose-50', border: 'border-rose-200', questions: 3, duration: '12 min', desc: 'Situations réelles du quotidien canadien avec feedback IA.', taches: true },
];

const AVANTAGES = [
  { icon: '📊', title: 'Suivi de Progression', desc: 'Tableau de bord complet pour suivre tes scores en temps réel et identifier tes points à améliorer.', color: 'text-red-700', bg: 'bg-red-50' },
  { icon: '🤖', title: 'Simulateur IA Sophie', desc: 'Notre IA corrige tes textes avec précision, explique chaque erreur et propose une version corrigée.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: '📅', title: 'Version 2026', desc: "Contenus conformes aux dernières mises à jour de l'examen TCF Canada officiel.", color: 'text-amber-600', bg: 'bg-amber-50' },
  { icon: '🎯', title: 'Conditions Réelles', desc: "Entraîne-toi dans les mêmes conditions que l'examen officiel : même format, même durée, même niveau.", color: 'text-rose-600', bg: 'bg-rose-50' },
  { icon: '⏰', title: 'Accès 24h/7j', desc: 'Révise à ton rythme, où que tu sois, quand tu le souhaites. La plateforme ne dort jamais.', color: 'text-sky-600', bg: 'bg-sky-50' },
  { icon: '🍁', title: 'Communauté Diaspora', desc: 'Rejoins des milliers de Camerounais et Africains qui se préparent ensemble au TCF Canada.', color: 'text-red-600', bg: 'bg-red-50' },
];

const FAQ_ITEMS = [
  { q: "Les tests sont-ils similaires à l'examen réel ?", a: "Oui, nos tests reproduisent exactement les conditions du TCF Canada officiel : même format, même durée, même niveau de difficulté. Les questions sont basées sur les thèmes réels de l'immigration, du travail et de la vie quotidienne au Canada." },
  { q: 'Combien de temps faut-il pour se préparer au TCF Canada ?', a: "Cela dépend de ton niveau de départ. En général, 4 à 8 semaines de pratique régulière (30 min/jour) sont suffisantes pour progresser d'un niveau. Notre outil de calcul NCLC te permet d'évaluer la distance à parcourir selon ton programme d'immigration." },
  { q: "Le simulateur d'expression écrite corrige-t-il vraiment bien ?", a: "Sophie IA analyse tes textes avec une précision remarquable. Elle identifie les erreurs grammaticales, propose des corrections avec explications, donne un score /100 et des conseils personnalisés. Des milliers d'apprenants l'utilisent avec succès." },
  { q: 'Quelle est la différence entre TCF Canada et TCF Québec ?', a: "Le TCF Canada est reconnu par l'IRCC pour les programmes fédéraux (Entrée Express, PNP). Le TCF Québec (anciennement TEF Québec) est requis pour le Québec (PEQ, etc.). Notre plateforme prépare aux deux examens car ils partagent le même format." },
  { q: 'Puis-je accéder à la plateforme depuis mon téléphone ?', a: "Oui, la plateforme est entièrement responsive et optimisée pour mobile. Tu peux t'entraîner depuis n'importe quel appareil : téléphone, tablette ou ordinateur." },
  { q: 'Comment fonctionne le calcul NCLC ?', a: "Le NCLC (Niveaux de compétence linguistique canadiens) est l'échelle officielle utilisée par l'IRCC pour évaluer le français. Notre calculateur convertit tes scores TCF Canada en niveaux NCLC en utilisant le tableau officiel du gouvernement canadien." },
];

const HOW_STEPS = [
  { num: '01', title: 'Crée ton compte gratuit', desc: "Inscris-toi en 30 secondes. Aucune carte bancaire requise. Accès immédiat à toutes les compétences.", icon: '🚀', color: 'from-red-600 to-rose-500' },
  { num: '02', title: 'Pratique avec Sophie IA', desc: "Sophie s'adapte à ton niveau, corrige chaque erreur en temps réel et t'explique les règles de grammaire.", icon: '🤖', color: 'from-red-500 to-amber-500' },
  { num: '03', title: 'Obtiens ton score TCF', desc: "Passe un examen simulé complet et reçois une estimation précise de ton score officiel TCF Canada.", icon: '🏆', color: 'from-amber-500 to-orange-500' },
];

const CANADA_CITIES = [
  { src: 'https://images.unsplash.com/photo-1519178614-68673b201f36?w=1920&q=80', city: 'Montréal', province: 'Québec' },
  { src: 'https://images.unsplash.com/photo-1517090504586-fde19ea6066f?w=1920&q=80', city: 'Toronto', province: 'Ontario' },
  { src: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1920&q=80', city: 'Vancouver', province: 'Colombie-Britannique' },
  { src: 'https://images.unsplash.com/photo-1599458252573-56ae36120de1?w=1920&q=80', city: 'Ottawa', province: 'Ontario' },
];

// Feuille d'érable SVG inline
function MapleLeaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
      <path d="M50 5 L56 28 L80 20 L68 38 L95 42 L76 55 L85 78 L62 67 L60 95 L50 80 L40 95 L38 67 L15 78 L24 55 L5 42 L32 38 L20 20 L44 28 Z" />
    </svg>
  );
}

function Stars({ n }: { n: number }) {
  return <div className="flex gap-0.5 text-amber-400 text-base">{'★'.repeat(n)}<span className="text-slate-200">{'★'.repeat(5 - n)}</span></div>;
}

function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
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
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, target]);
  return <span ref={ref}>{prefix}{count.toLocaleString('fr-CA')}{suffix}</span>;
}

function NclcCalculator() {
  const [scores, setScores] = useState({ ce: '', co: '', ee: '', eo: '' });
  const [result, setResult] = useState<Record<string, number | null> | null>(null);

  function calculate() {
    const ce = parseInt(scores.ce) || 0;
    const co = parseInt(scores.co) || 0;
    const ee = parseInt(scores.ee) || 0;
    const eo = parseInt(scores.eo) || 0;
    setResult({
      ce: getNclc(ce, 699, 'ce'),
      co: getNclc(co, 699, 'co'),
      ee: getNclc(ee, 20, 'ee'),
      eo: getNclc(eo, 20, 'eo'),
    });
  }

  const nclcColor = (n: number | null) => {
    if (!n) return 'bg-slate-100 text-slate-400';
    if (n >= 9) return 'bg-emerald-100 text-emerald-700';
    if (n >= 7) return 'bg-red-100 text-red-700';
    if (n >= 5) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-600';
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-3xl mb-2">🧮</div>
        <h3 className="text-2xl font-black text-slate-800">Calculez votre niveau NCLC</h3>
        <p className="text-slate-500 text-sm mt-1">Entrez vos scores TCF Canada pour connaître instantanément votre niveau NCLC</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { key: 'ce', label: 'Compréhension Écrite', icon: '📖', max: 699, placeholder: '342-699' },
          { key: 'co', label: 'Compréhension Orale', icon: '🎧', max: 699, placeholder: '331-699' },
          { key: 'ee', label: 'Expression Écrite', icon: '✍️', max: 20, placeholder: '4-20' },
          { key: 'eo', label: 'Expression Orale', icon: '🎤', max: 20, placeholder: '4-20' },
        ].map(({ key, label, icon, max, placeholder }) => (
          <div key={key}>
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1 mb-1.5">{icon} {label}</label>
            <div className="relative">
              <input
                type="number" min={0} max={max} placeholder={placeholder}
                value={scores[key as keyof typeof scores]}
                onChange={e => setScores(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">/{max}</span>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={calculate}
        className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white font-black py-4 rounded-2xl shadow hover:shadow-md hover:-translate-y-0.5 transition-all text-sm"
      >
        Calculer mon niveau NCLC →
      </button>
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center mb-3">Tes niveaux NCLC</div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { key: 'ce', label: 'C. Écrite', icon: '📖' },
                { key: 'co', label: 'C. Orale', icon: '🎧' },
                { key: 'ee', label: 'E. Écrite', icon: '✍️' },
                { key: 'eo', label: 'E. Orale', icon: '🎤' },
              ].map(({ key, label, icon }) => (
                <div key={key} className="text-center">
                  <div className="text-lg mb-1">{icon}</div>
                  <div className={`text-2xl font-black rounded-xl py-2 ${nclcColor(result[key])}`}>{result[key] ?? '—'}</div>
                  <div className="text-xs text-slate-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
            {Object.values(result).some(v => v !== null) && (
              <div className="mt-4 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-900">
                <span className="font-bold">Conseil :</span>{' '}
                {(() => {
                  const min = Math.min(...Object.values(result).filter(v => v !== null) as number[]);
                  if (min >= 7) return `Excellent ! NCLC ${min}+ — tu réponds aux exigences de la plupart des programmes d'immigration.`;
                  if (min >= 5) return `NCLC ${min} — continue à pratiquer pour atteindre le NCLC 7 requis pour Entrée Express FSW.`;
                  return `NCLC ${min} — encore quelques mois de préparation. Travaille surtout les compétences en rouge.`;
                })()}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ delay: index * 0.07 }}
      className="border border-slate-200 rounded-2xl overflow-hidden"
    >
      <button onClick={() => setOpen(o => !o)}
        className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 bg-white hover:bg-red-50 transition-colors">
        <span className="font-bold text-slate-800 text-sm leading-relaxed">{q}</span>
        <span className={`text-red-500 font-black text-xl flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed bg-red-50/40 border-t border-red-100">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [cityIdx, setCityIdx] = useState(0);

  useEffect(() => {
    const fallback = { totalUsers: 2134, totalSessions: 13210, averageScore: 74, successRate: 87 };
    fetch(`${BASE}/api/stats`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { if (d && typeof d.totalUsers === 'number') setStats(d); else setStats(fallback); })
      .catch(() => setStats(fallback));
    const city = setInterval(() => setCityIdx(i => (i + 1) % CANADA_CITIES.length), 5000);
    return () => clearInterval(city);
  }, []);

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">

      {/* ── NAV FIXE (bande drapeau + barre de navigation) ───── */}
      <div className="fixed top-0 left-0 right-0 z-50">
        {/* Bande drapeau canadien */}
        <div className="flex h-1.5 w-full">
          <div className="w-1/4 bg-red-600" />
          <div className="w-1/2 bg-white border-b border-slate-100" />
          <div className="w-1/4 bg-red-600" />
        </div>
        <nav className="bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <MapleLeaf className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-lg font-black text-slate-900 whitespace-nowrap">RéussirTCF</span>
          </motion.div>

          {/* Liens centre */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600 flex-1 justify-center">
            {[
              { href: '#sections', label: 'Compétences' },
              { href: '#nclc',     label: 'Calcul NCLC' },
              { href: '#tarifs',   label: 'Tarifs' },
              { href: '#faq',      label: 'FAQ' },
            ].map(l => (
              <a key={l.href} href={l.href}
                className="px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors whitespace-nowrap">
                {l.label}
              </a>
            ))}
          </motion.div>

          {/* Actions droite */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 flex-shrink-0">
            <Link href="/login"
              className="hidden sm:block text-sm font-semibold text-slate-600 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-50">
              Connexion
            </Link>
            <Link href="/register"
              className="text-sm font-bold bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full shadow-sm hover:shadow hover:-translate-y-px transition-all whitespace-nowrap">
              <span className="sm:hidden">Démarrer</span>
              <span className="hidden sm:inline">Commencer gratuitement</span>
            </Link>
          </motion.div>

        </div>
        </nav>
      </div>

      {/* Espaceur pour compenser la nav fixe (bande 6px + nav 56px) */}
      <div className="h-[62px]" />

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[640px] lg:min-h-[720px] flex items-center">

        {/* Slideshow background */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="sync">
            {CANADA_CITIES.map((c, i) => i === cityIdx && (
              <motion.div key={c.city} className="absolute inset-0"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 1.8, ease: 'easeInOut' }}>
                <img src={c.src} alt={c.city} className="w-full h-full object-cover" loading="eager" />
              </motion.div>
            ))}
          </AnimatePresence>
          {/* Overlay rouge canadien sur la gauche, fondu vers le centre */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/92 via-slate-950/70 to-slate-950/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/20" />
          {/* Feuilles d'érable en watermark */}
          <div className="absolute right-8 top-12 opacity-5 pointer-events-none hidden lg:block">
            <MapleLeaf className="w-72 h-72 text-white" />
          </div>
          <div className="absolute right-32 bottom-8 opacity-5 pointer-events-none hidden lg:block">
            <MapleLeaf className="w-40 h-40 text-white" />
          </div>
        </div>

        {/* Contenu */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-28 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

          <motion.div className="flex-1 space-y-7" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            {/* Badge Canada */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
              <MapleLeaf className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-white/90 font-semibold">Communauté Camerounaise &amp; Diaspora Canada</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1]">
              Réussis ton{' '}
              <span className="text-red-400">TCF&nbsp;Canada</span>
            </h1>

            <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
              Pratique les 4 compétences du TCF Canada.
              Corrections instantanées, examens simulés et suivi de progression personnalisé.
            </p>

            <div className="flex flex-wrap gap-3 sm:gap-4">
              <Link href="/register" className="group inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 sm:px-8 sm:py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm sm:text-base">
                Commencer gratuitement
                <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.3 }}>→</motion.span>
              </Link>
              <a href="#nclc" className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-bold px-5 py-3 sm:px-8 sm:py-4 rounded-2xl hover:bg-white/10 transition-all text-sm sm:text-base backdrop-blur-sm">
                🧮 Calculer mon NCLC
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {['AlineT', 'PatrickN', 'JeanBaptiste', 'Christelle'].map(s => (
                    <img key={s} src={`https://api.dicebear.com/9.x/personas/svg?seed=${s}`} className="w-8 h-8 rounded-full border-2 border-white/40 bg-slate-100 object-cover" alt="" />
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 text-amber-400 text-xs">★★★★★</div>
                  <div className="text-xs text-slate-300">+{stats?.totalUsers ? stats.totalUsers.toLocaleString('fr-CA') : '2 134'} apprenants</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-300"><span className="text-emerald-400">✓</span> Gratuit pour commencer</div>
              <div className="flex items-center gap-1.5 text-sm text-slate-300"><span className="text-emerald-400">✓</span> Pas de carte bancaire</div>
            </div>
          </motion.div>

          {/* Carte flottante drapeau */}
          <motion.div
            className="hidden lg:flex flex-col items-center gap-4"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-3xl p-8 flex flex-col items-center gap-5 shadow-2xl">
              {/* Mini drapeau canadien */}
              <div className="flex w-36 h-20 rounded-xl overflow-hidden shadow-lg">
                <div className="w-[30%] bg-red-600" />
                <div className="w-[40%] bg-white flex items-center justify-center">
                  <MapleLeaf className="w-8 h-8 text-red-600" />
                </div>
                <div className="w-[30%] bg-red-600" />
              </div>
              <div className="text-center">
                <div className="text-white font-black text-lg">Canada 🍁</div>
                <div className="text-white/60 text-xs mt-0.5">4 villes, 1 rêve</div>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full">
                {['Montréal', 'Toronto', 'Vancouver', 'Ottawa'].map(c => (
                  <div key={c} className="bg-white/10 rounded-xl px-3 py-1.5 text-center">
                    <span className="text-white/80 text-xs font-semibold">📍 {c}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>

        {/* Indicateur ville */}
        <div className="absolute bottom-5 left-0 right-0 z-20 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-white/60 text-xs font-medium">
            <span>📍</span>
            <AnimatePresence mode="wait">
              <motion.span key={cityIdx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.4 }}>
                {CANADA_CITIES[cityIdx].city}, {CANADA_CITIES[cityIdx].province}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="flex gap-1.5">
            {CANADA_CITIES.map((_, i) => (
              <button key={i} onClick={() => setCityIdx(i)}
                className={`h-1 rounded-full transition-all duration-500 ${i === cityIdx ? 'w-7 bg-red-500' : 'w-2 bg-white/30 hover:bg-white/50'}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="bg-red-700 py-16 relative overflow-hidden">
        {/* Feuille d'érable watermark */}
        <div className="absolute right-0 top-0 bottom-0 flex items-center pr-8 opacity-10 pointer-events-none">
          <MapleLeaf className="w-64 h-64 text-white" />
        </div>
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <p className="text-red-200 text-sm font-semibold uppercase tracking-widest mb-2">Résultats prouvés</p>
            <h2 className="text-3xl font-black text-white">La communauté qui réussit 🍁</h2>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: 'Apprenants actifs', value: stats?.totalUsers ?? 0, suffix: '+', icon: '👨‍🎓' },
              { label: 'Sessions de pratique', value: stats?.totalSessions ?? 0, suffix: '+', icon: '📝' },
              { label: 'Score moyen /100', value: stats?.averageScore ?? 0, suffix: '', icon: '🎯' },
              { label: 'Taux de réussite', value: stats?.successRate ?? 0, suffix: '%', icon: '🏆' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="text-4xl font-black text-white mb-1"><AnimatedCounter target={s.value} suffix={s.suffix} /></div>
                <div className="text-red-200 text-sm font-medium">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LES 4 ÉPREUVES ────────────────────────────────────── */}
      <section id="sections" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div className="text-center mb-6" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">Entraînement complet</p>
            <h2 className="text-4xl font-black text-slate-900">Les 4 Épreuves du TCF Canada</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">Maîtrisez chaque épreuve avec nos entraînements spécialisés et nos simulations en conditions réelles.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {TCF_SECTIONS.map((s, i) => (
              <motion.div key={s.code}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }} whileHover={{ y: -6, scale: 1.02 }}
                className={`${s.bg} border-2 ${s.border} rounded-3xl p-7 flex flex-col gap-5 shadow-sm hover:shadow-lg transition-all group`}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform`}>
                  {s.icon}
                </div>
                <div className="flex-1">
                  <div className="font-black text-slate-800 text-xl mb-0.5">{s.code}</div>
                  <div className="text-sm font-semibold text-slate-600 mb-3">{s.label}</div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{s.desc}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="bg-white/80 px-2 py-0.5 rounded-full font-semibold border border-slate-200">
                      {s.taches ? `${s.questions} tâches` : `${s.questions} questions`}
                    </span>
                    <span className="bg-white/80 px-2 py-0.5 rounded-full font-semibold border border-slate-200">{s.duration}</span>
                  </div>
                </div>
                <Link href="/register"
                  className={`w-full text-center text-sm font-bold py-2.5 rounded-xl bg-gradient-to-r ${s.color} text-white shadow hover:shadow-md transition-all`}>
                  Commencer →
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NOS AVANTAGES ────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div className="text-center mb-16" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">Pourquoi RéussirTCF ?</p>
            <h2 className="text-4xl font-black text-slate-900">Nos Avantages</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">Tout ce dont vous avez besoin pour réussir votre TCF Canada, réuni en une seule plateforme.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {AVANTAGES.map((a, i) => (
              <motion.div key={a.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex gap-4">
                <div className={`w-12 h-12 rounded-xl ${a.bg} flex items-center justify-center text-2xl flex-shrink-0`}>{a.icon}</div>
                <div>
                  <div className={`font-black text-sm ${a.color} mb-1`}>{a.title}</div>
                  <div className="text-slate-500 text-xs leading-relaxed">{a.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ────────────────────────────────── */}
      <section id="how" className="py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div className="text-center mb-16" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">Simple &amp; efficace</p>
            <h2 className="text-4xl font-black text-slate-900">Comment ça marche ?</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">En 3 étapes simples, tu passes de zéro à confiant pour ton examen TCF Canada.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_STEPS.map((step, i) => (
              <motion.div key={step.num} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="relative bg-white rounded-3xl p-8 shadow-md border border-slate-100 flex flex-col gap-5">
                {i < 2 && <div className="hidden md:block absolute top-12 -right-5 z-10 text-red-200 text-2xl">→</div>}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-2xl shadow-md`}>{step.icon}</div>
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

      {/* ── CALCULATEUR NCLC ─────────────────────────────────── */}
      <section id="nclc" className="py-24 bg-gradient-to-br from-red-50 to-slate-50 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 flex items-center pl-4 opacity-5 pointer-events-none hidden lg:flex">
          <MapleLeaf className="w-96 h-96 text-red-600" />
        </div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <span className="inline-block bg-red-100 text-red-700 text-xs font-black px-3 py-1 rounded-full mb-4">🍁 Outil Gratuit</span>
            <h2 className="text-4xl font-black text-slate-900">Calculez votre niveau NCLC</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">Entrez vos scores TCF Canada pour connaître instantanément votre niveau NCLC et vérifier votre éligibilité aux programmes d'immigration.</p>
          </motion.div>
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <NclcCalculator />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 bg-red-700">
                  <h3 className="font-black text-white text-sm">Tableau d&apos;équivalence NCLC officiel</h3>
                  <p className="text-red-200 text-xs mt-0.5">Référence officielle — Gouvernement du Canada</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="py-3 px-4 text-left font-black text-slate-600">NCLC</th>
                        <th className="py-3 px-3 text-center font-black text-violet-600">📖 C.É.</th>
                        <th className="py-3 px-3 text-center font-black text-emerald-600">✍️ E.É.</th>
                        <th className="py-3 px-3 text-center font-black text-sky-600">🎧 C.O.</th>
                        <th className="py-3 px-3 text-center font-black text-rose-600">🎤 E.O.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {NCLC_TABLE.map((row, i) => (
                        <tr key={row.nclc} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-red-50/40 transition-colors`}>
                          <td className="py-2.5 px-4">
                            <span className={`font-black text-sm px-2 py-0.5 rounded-lg ${parseInt(row.nclc) >= 9 ? 'bg-emerald-100 text-emerald-700' : parseInt(row.nclc) >= 7 ? 'bg-red-100 text-red-700' : parseInt(row.nclc) >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                              {row.nclc}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-medium">{row.ce[0]}–{row.ce[1]}</td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-medium">{row.ee[0]}–{row.ee[1]}</td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-medium">{row.co[0]}–{row.co[1]}</td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-medium">{row.eo[0]}–{row.eo[1]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
                  <div className="flex gap-3 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 inline-block" /> NCLC 9-10 : Entrée Express niveau avancé</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-200 inline-block" /> NCLC 7-8 : Entrée Express FSW / CEC</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ──────────────────────────────────────── */}
      <section id="temoignages" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div className="text-center mb-16" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">Ils ont réussi</p>
            <h2 className="text-4xl font-black text-slate-900">La diaspora témoigne 🍁</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">Des centaines de Camerounais au Canada ont obtenu leur score TCF avec RéussirTCF.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.seed} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md hover:shadow-xl transition-all flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <img src={`https://api.dicebear.com/9.x/personas/svg?seed=${t.seed}`} alt="" loading="lazy" className="w-12 h-12 rounded-full border-2 border-red-100 shadow bg-slate-100 object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm truncate">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.city}</div>
                  </div>
                </div>
                <Stars n={t.stars} />
                <p className="text-sm text-slate-600 leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
                <div className={`text-xs font-bold px-3 py-1 rounded-full w-fit ${t.badgeColor}`}>{t.badge}</div>
              </motion.div>
            ))}
          </div>
          <motion.div className="mt-12 flex flex-col items-center gap-2" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <div className="flex gap-1 text-amber-400 text-2xl">★★★★★</div>
            <div className="text-slate-800 font-black text-xl">4,9/5</div>
            <div className="text-slate-500 text-sm">Basé sur {stats?.totalUsers ? stats.totalUsers.toLocaleString('fr-CA') : '2 134'}+ évaluations</div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div className="text-center mb-12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <p className="text-red-600 text-sm font-bold uppercase tracking-widest mb-3">On répond à tout</p>
            <h2 className="text-4xl font-black text-slate-900">Questions Fréquentes</h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto">Les réponses aux questions les plus posées par nos apprenants.</p>
          </motion.div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} index={i} />)}
          </div>
          <motion.div className="mt-10 text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <p className="text-slate-500 text-sm mb-4">Vous avez une autre question ?</p>
            <a href="mailto:support@reussirtcf.ca" className="inline-flex items-center gap-2 bg-white border-2 border-red-200 text-red-600 font-bold px-6 py-3 rounded-xl hover:bg-red-50 transition-colors text-sm">
              📧 Contacter le support
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── TARIFS ───────────────────────────────────────────── */}
      <section id="tarifs" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-flex items-center gap-2 bg-red-50 text-red-600 text-xs font-bold px-4 py-1.5 rounded-full mb-4">🍁 Nos Tarifs</span>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Choisissez votre plan</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Commencez gratuitement, évoluez selon vos besoins. Tous les plans incluent l&apos;accès à Sophie, votre tutrice IA.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
            className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl flex-shrink-0">🎁</div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-slate-800">Plan Gratuit</h3>
                  <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Toujours gratuit</span>
                </div>
                <p className="text-sm text-slate-500">3 sessions d&apos;essai par section · Résultats basiques · Chat IA limité</p>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="text-3xl font-black text-slate-800">0 $</span>
              <Link href="/register" className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all whitespace-nowrap">
                Commencer →
              </Link>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                emoji: '🥉', name: 'Bronze', price: '14,99 $', period: 'paiement unique',
                color: 'from-orange-400 to-amber-500', border: 'border-amber-200',
                cta: 'bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white',
                url: process.env.NEXT_PUBLIC_STRIPE_BRONZE_URL ?? '/pricing',
                features: ['1 section au choix', '10 sessions de pratique', 'Correction IA EE', 'Résultats détaillés'],
                missing: ['Sessions illimitées', 'Examen simulé complet'],
                popular: false,
              },
              {
                emoji: '🥈', name: 'Silver', price: '29,99 $', period: 'par mois',
                color: 'from-red-600 to-rose-500', border: 'border-red-300',
                cta: 'bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 text-white',
                url: process.env.NEXT_PUBLIC_STRIPE_SILVER_URL ?? '/pricing',
                features: ['Toutes les sections', 'Sessions illimitées', 'Correction IA avancée', 'Examen simulé complet', 'Dashboard progression', 'Soumissions aux profs'],
                missing: ['Accès prioritaire nouveautés'],
                popular: true,
              },
              {
                emoji: '🥇', name: 'Gold', price: '49,99 $', period: 'tous les 2 mois',
                color: 'from-yellow-400 to-amber-400', border: 'border-yellow-300',
                cta: 'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-900',
                url: process.env.NEXT_PUBLIC_STRIPE_GOLD_URL ?? '/pricing',
                features: ['Tout Silver inclus', 'Accès prioritaire', 'Corrections prof 48h', 'Sessions live 2×/mois', 'Ressources PDF & audio', 'Support WhatsApp prioritaire'],
                missing: [],
                popular: false,
              },
            ].map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.08 }}
                className={`relative bg-white rounded-2xl border-2 ${plan.border} overflow-hidden flex flex-col ${plan.popular ? 'ring-2 ring-red-500 shadow-xl' : 'shadow-sm'}`}>
                {plan.popular && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-rose-500" />}
                {plan.popular && (
                  <div className="absolute top-4 right-4">
                    <span className="text-xs font-black bg-red-600 text-white px-3 py-1 rounded-full">🍁 Populaire</span>
                  </div>
                )}
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-xl shadow-sm flex-shrink-0`}>{plan.emoji}</div>
                    <div><h3 className="font-black text-slate-800 text-lg">{plan.name}</h3></div>
                  </div>
                  <div className="mb-5">
                    <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                    <span className="text-sm text-slate-400 ml-2">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((f, j) => (
                      <li key={j} className="text-sm text-slate-600 flex items-center gap-2">
                        <span className="text-emerald-500 flex-shrink-0">✓</span>{f}
                      </li>
                    ))}
                    {plan.missing.map((f, j) => (
                      <li key={j} className="text-sm text-slate-300 flex items-center gap-2">
                        <span className="flex-shrink-0">✗</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-6 pt-0">
                  <a href={user ? `${plan.url}?client_reference_id=${user.id}` : plan.url}
                    target="_blank" rel="noopener noreferrer"
                    className={`w-full py-3 rounded-xl font-black text-sm transition-all text-center block ${plan.cta}`}>
                    Choisir {plan.name}
                  </a>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center text-sm text-slate-400 mt-8">
            🛡️ Satisfait ou remboursé — 14 jours · Paiement sécurisé par Stripe · Annulation à tout moment
          </motion.p>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <motion.div
          className="max-w-4xl mx-auto bg-red-700 rounded-3xl p-12 md:p-16 shadow-2xl text-center relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
        >
          {/* Décorations drapeau */}
          <div className="absolute top-0 left-0 bottom-0 w-12 bg-red-600/60" />
          <div className="absolute top-0 right-0 bottom-0 w-12 bg-red-600/60" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10" />
          {/* Feuilles d'érable en arrière-plan */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <MapleLeaf className="w-96 h-96 text-white" />
          </div>
          <div className="relative z-10 space-y-6">
            <motion.div animate={{ rotate: [0, -5, 5, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
              <MapleLeaf className="w-16 h-16 text-white mx-auto" />
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-black text-white">Prêt à réussir ton TCF Canada ?</h2>
            <p className="text-red-200 text-lg max-w-xl mx-auto">
              Rejoins {stats?.totalUsers ? stats.totalUsers.toLocaleString('fr-CA') : '2 134'}+ apprenants de la diaspora camerounaise qui se préparent avec RéussirTCF.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/register" className="bg-white text-red-700 font-black px-10 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-base">
                Créer mon compte gratuit →
              </Link>
              <Link href="/login" className="border-2 border-white/40 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/10 transition-all text-base">
                Déjà inscrit ? Connexion
              </Link>
            </div>
            <p className="text-red-300 text-sm">Gratuit pour commencer · Aucune carte bancaire requise</p>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400">
        {/* Bande drapeau en haut du footer */}
        <div className="flex h-1 w-full">
          <div className="w-1/4 bg-red-600" />
          <div className="w-1/2 bg-white/10" />
          <div className="w-1/4 bg-red-600" />
        </div>

        <div className="border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-white font-black text-lg">Reste informé des nouveautés TCF Canada</div>
              <div className="text-slate-400 text-sm mt-1">Conseils, nouvelles questions, dates d&apos;examen en avant-première</div>
            </div>
            <NewsletterForm />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <MapleLeaf className="w-6 h-6 text-red-500" />
                <div className="text-2xl font-black text-white">RéussirTCF</div>
              </div>
              <div className="text-xs bg-red-900/50 text-red-300 inline-flex px-2 py-0.5 rounded-full mt-1 border border-red-800">TCF Canada 2026</div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">La plateforme de préparation TCF Canada conçue pour la diaspora camerounaise et africaine au Canada. Sophie, ton IA tutrice, t&apos;accompagne 24h/24.</p>
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
                  <button key={s.label} title={s.label} className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm font-black transition-all ${s.bg} ${s.text}`}>{s.icon}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-black text-white uppercase tracking-widest">Compétences TCF</div>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: '🎧 Compréhension Orale', sub: '39 QCM · 35 min' },
                { label: '📖 Compréhension Écrite', sub: '39 QCM · 60 min' },
                { label: '✍️ Expression Écrite', sub: '3 tâches · 60 min' },
                { label: '🎤 Expression Orale', sub: '3 tâches · 12 min' },
                { label: '🎯 Examen simulé complet', sub: 'Format officiel TCF' },
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

          <div className="space-y-4">
            <div className="text-sm font-black text-white uppercase tracking-widest">Ressources</div>
            <ul className="space-y-2.5 text-sm">
              {['Comment ça marche', 'Guide TCF Canada 2026', 'Calcul NCLC / CLB', 'Programmes immigration', 'Témoignages', 'FAQ'].map(item => (
                <li key={item}><a href="#" className="text-slate-400 hover:text-white transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-black text-white uppercase tracking-widest">Légal &amp; Support</div>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Politique de confidentialité', href: '/legal/privacy' },
                { label: "Conditions d'utilisation", href: '/legal/terms' },
                { label: 'Politique de remboursement', href: '/legal/refund' },
                { label: 'Contact / Support', href: '/legal/contact' },
              ].map(item => (
                <li key={item.href}><a href={item.href} className="text-slate-400 hover:text-white transition-colors">{item.label}</a></li>
              ))}
            </ul>
            <div className="pt-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Contact</div>
              <a href="mailto:support@reussirtcf.ca" className="text-xs text-red-400 hover:text-red-300 transition-colors">support@reussirtcf.ca</a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <MapleLeaf className="w-4 h-4 text-red-600" />
              <span>© {new Date().getFullYear()} RéussirTCF Inc. · Tous droits réservés · Montréal, Canada</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-xs text-slate-600 uppercase tracking-widest">Moyens de paiement acceptés</div>
              <div className="flex flex-wrap justify-center gap-2">
                <div className="bg-white rounded-lg px-3 py-1.5"><span className="text-blue-700 font-black text-sm italic">VISA</span></div>
                <div className="bg-white rounded-lg px-2.5 py-1.5 flex items-center gap-1"><div className="flex -space-x-1.5"><div className="w-5 h-5 rounded-full bg-red-500" /><div className="w-5 h-5 rounded-full bg-yellow-400" /></div><span className="text-slate-700 font-bold text-xs ml-1">MC</span></div>
                <div className="bg-white rounded-lg px-3 py-1.5"><span className="text-blue-800 font-black text-sm">Pay</span><span className="text-blue-400 font-black text-sm">Pal</span></div>
                <div className="bg-yellow-400 rounded-lg px-3 py-1.5"><span className="text-yellow-900 font-black text-xs">INTERAC</span></div>
                <div className="bg-orange-500 rounded-lg px-3 py-1.5"><span className="text-white font-black text-xs">Orange Money</span></div>
                <div className="bg-yellow-400 rounded-lg px-3 py-1.5"><span className="text-slate-900 font-black text-xs">MTN MoMo</span></div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500"><span>🌍</span><span>Français (Canada)</span></div>
          </div>
        </div>
      </footer>
    </main>
  );
}
