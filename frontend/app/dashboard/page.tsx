'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import ScoreRing from '../../components/ScoreRing';
import Spinner from '../../components/Spinner';
import { api, DashboardData, HistoryItem, LessonAssigned } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

type SectionCode = 'CO' | 'CE' | 'EE' | 'EO';
type ScoreTarget = { min: number; max: number; unit: string; nclc: number };

const GOAL_SCORES: Record<string, { label: string; icon: string; color: string; nclc: number | null; scores: Record<SectionCode, ScoreTarget | null> | null }> = {
  fsw:      { label: 'Entrée Express FSW',     icon: '🌟', color: 'indigo', nclc: 7, scores: { CO: { min: 458, max: 699, unit: '/699', nclc: 7 }, CE: { min: 453, max: 699, unit: '/699', nclc: 7 }, EE: { min: 10, max: 20, unit: '/20', nclc: 7 }, EO: { min: 10, max: 20, unit: '/20', nclc: 7 } } },
  cec_ab:   { label: 'Entrée Express CEC 0/A', icon: '🍁', color: 'red',    nclc: 7, scores: { CO: { min: 458, max: 699, unit: '/699', nclc: 7 }, CE: { min: 453, max: 699, unit: '/699', nclc: 7 }, EE: { min: 10, max: 20, unit: '/20', nclc: 7 }, EO: { min: 10, max: 20, unit: '/20', nclc: 7 } } },
  cec_b:    { label: 'Entrée Express CEC B',   icon: '🔧', color: 'orange', nclc: 5, scores: { CO: { min: 369, max: 699, unit: '/699', nclc: 5 }, CE: { min: 375, max: 699, unit: '/699', nclc: 5 }, EE: { min: 6,  max: 20, unit: '/20', nclc: 5 }, EO: { min: 6,  max: 20, unit: '/20', nclc: 5 } } },
  pnp:      { label: 'PNP Provincial',         icon: '🏙️', color: 'teal',   nclc: 4, scores: { CO: { min: 331, max: 699, unit: '/699', nclc: 4 }, CE: { min: 342, max: 699, unit: '/699', nclc: 4 }, EE: { min: 4,  max: 20, unit: '/20', nclc: 4 }, EO: { min: 4,  max: 20, unit: '/20', nclc: 4 } } },
  peq:      { label: 'Québec PEQ',             icon: '🌺', color: 'sky',    nclc: 7, scores: { CO: { min: 458, max: 699, unit: '/699', nclc: 7 }, CE: { min: 453, max: 699, unit: '/699', nclc: 7 }, EE: { min: 10, max: 20, unit: '/20', nclc: 7 }, EO: { min: 10, max: 20, unit: '/20', nclc: 7 } } },
  citizenship: { label: 'Citoyenneté',         icon: '🏛️', color: 'rose',   nclc: 4, scores: { CO: { min: 331, max: 699, unit: '/699', nclc: 4 }, CE: null, EE: null, EO: { min: 4, max: 20, unit: '/20', nclc: 4 } } },
};

const SECTION_META: Record<SectionCode, { label: string; icon: string; color: string; radarColor: string; bg: string; border: string }> = {
  CO: { label: 'Compréhension Orale',  icon: '🎧', color: 'from-sky-400 to-cyan-500',      radarColor: '#0ea5e9', bg: 'bg-sky-50',     border: 'border-sky-200' },
  CE: { label: 'Compréhension Écrite', icon: '📖', color: 'from-violet-400 to-purple-500',  radarColor: '#8b5cf6', bg: 'bg-violet-50',  border: 'border-violet-200' },
  EE: { label: 'Expression Écrite',    icon: '✍️', color: 'from-emerald-400 to-teal-500',   radarColor: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  EO: { label: 'Expression Orale',     icon: '🎤', color: 'from-rose-400 to-pink-500',      radarColor: '#f43f5e', bg: 'bg-rose-50',    border: 'border-rose-200' },
};

const SECTIONS = Object.entries(SECTION_META).map(([code, m]) => ({ code: code as SectionCode, ...m }));

function buildRecommendations(dashboard: DashboardData | null, goalData: typeof GOAL_SCORES[string] | null): string[] {
  const recs: string[] = [];
  if (!dashboard) return recs;

  const sections: SectionCode[] = ['CO', 'CE', 'EE', 'EO'];
  const statMap: Record<string, number | null> = {};
  sections.forEach(s => {
    const st = dashboard.stats.find(x => x.section === s);
    statMap[s] = st?.averageScore ?? null;
  });

  const weakest = sections
    .filter(s => statMap[s] !== null)
    .sort((a, b) => (statMap[a] ?? 0) - (statMap[b] ?? 0));

  if (weakest.length === 0) {
    recs.push('Commence par pratiquer la Compréhension Orale (CO) — c\'est la section la plus importante du TCF.');
    recs.push('Enchaîne avec la Compréhension Écrite (CE) pour couvrir les deux compétences passives.');
    return recs;
  }

  const w = weakest[0];
  const wScore = statMap[w] ?? 0;
  recs.push(`Ta section la plus faible est **${SECTION_META[w].label} (${w})** avec ${wScore}/100 en moyenne — concentre-toi dessus.`);

  if (goalData?.scores) {
    const missing = sections.filter(s => {
      const target = goalData.scores![s];
      const current = statMap[s];
      return target && (current === null || current < target.min);
    });
    if (missing.length > 0) {
      recs.push(`Pour atteindre ton objectif (${goalData.label}), il te manque encore : ${missing.join(', ')}.`);
    } else if (statMap[w] !== null) {
      recs.push('Bravo ! Tu atteins les objectifs de toutes les sections. Continue à t\'entraîner pour consolider tes scores.');
    }
  }

  if (wScore < 50) {
    recs.push('Lis les explications après chaque question incorrecte et prends le temps de comprendre la règle.');
  } else if (wScore < 70) {
    recs.push('Tu progresses bien ! Fais 10 minutes par jour pour maintenir la régularité.');
  } else {
    recs.push('Excellent niveau ! Continue à pratiquer chaque section pour consolider tes scores.');
  }

  const noPractice = sections.filter(s => statMap[s] === null);
  if (noPractice.length > 0) {
    recs.push(`Tu n'as pas encore pratiqué : ${noPractice.join(', ')}. Essaie au moins une session pour connaître ton niveau.`);
  }

  return recs.slice(0, 3);
}

function buildProgressData(history: HistoryItem[]): { date: string; CO?: number; CE?: number; EE?: number; EO?: number }[] {
  const byDate: Record<string, Record<string, number[]>> = {};
  history.forEach(h => {
    const d = new Date(h.createdAt).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
    if (!byDate[d]) byDate[d] = {};
    if (!byDate[d][h.section]) byDate[d][h.section] = [];
    byDate[d][h.section].push(h.score);
  });
  type ChartEntry = { date: string; CO?: number; CE?: number; EE?: number; EO?: number };
  return Object.entries(byDate).slice(-10).map(([date, secs]) => {
    const entry: ChartEntry = { date };
    Object.entries(secs).forEach(([s, scores]) => {
      (entry as Record<string, number | string>)[s] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    });
    return entry;
  });
}

function UserAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-black flex-shrink-0 shadow-sm"
    >
      {initials}
    </div>
  );
}

export default function DashboardPage() {
  const { user, logout, loading: authLoading, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lessons, setLessons] = useState<LessonAssigned[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newCorrections, setNewCorrections] = useState(0);
  const [isInClass, setIsInClass] = useState(false);

  const meta = clerkUser?.unsafeMetadata as { goal?: string; program?: string; completedOnboarding?: boolean } | undefined;
  const goalData = meta?.program ? GOAL_SCORES[meta.program] : meta?.goal === 'citizenship' ? GOAL_SCORES['citizenship'] : null;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    const role = clerkUser?.unsafeMetadata?.role as string | undefined;
    if (role === 'admin') { router.replace('/admin/dashboard'); return; }
    if (role === 'professeur') { router.replace('/prof/dashboard'); return; }
    if (role === 'pending_prof') { router.replace('/pending-approval'); return; }
    if (clerkUser && !clerkUser.unsafeMetadata?.completedOnboarding) {
      router.replace('/onboarding');
      return;
    }
  }, [user, clerkUser, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getToken().then(token => {
      Promise.all([
        api.progress.dashboard(user.id, token ?? undefined),
        api.progress.history(user.id, token ?? undefined),
        api.lessons.listByStudent(user.id, token ?? undefined).catch(() => ({ lessons: [] })),
        api.submissions.listForStudent(user.id, token ?? undefined).catch(() => ({ submissions: [] })),
        api.classes.listByStudent(user.id, token ?? undefined).catch(() => ({ classes: [] })),
      ])
        .then(([dash, hist, les, subs, cls]) => {
          setDashboard(dash);
          setHistory(hist.history);
          setLessons(les.lessons);
          setIsInClass(cls.classes.length > 0);
          const lastSeen = typeof window !== 'undefined'
            ? parseInt(localStorage.getItem('reussirtcf_corrections_seen') ?? '0')
            : 0;
          const count = subs.submissions.filter(s =>
            s.status === 'corrected' && s.correctedAt && new Date(s.correctedAt).getTime() > lastSeen
          ).length;
          setNewCorrections(count);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center"><Spinner size={40} /></div>
  );

  const recommendations = buildRecommendations(dashboard, goalData);
  const progressData = buildProgressData(history);
  const visibleHistory = showAllHistory ? history : history.slice(0, 5);
  const hasChartData = progressData.length >= 2;

  const radarData = SECTIONS.map(s => {
    const stat = dashboard?.stats.find(x => x.section === s.code);
    return { section: s.code, score: stat?.averageScore ?? 0, fullMark: 100 };
  });
  const hasRadarData = radarData.some(d => d.score > 0);
  const sectionsWithData = SECTIONS.filter(s => {
    const stat = dashboard?.stats.find(x => x.section === s.code);
    return (stat?.attempts ?? 0) > 0;
  });

  const firstName = user.full_name.split(' ')[0];
  const isNewUser = !loading && history.length === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <span className="text-lg font-black text-slate-900">🍁 RéussirTCF</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-sm text-slate-500 font-medium hidden sm:block">{firstName}</span>
            {isInClass && (
              <Link href="/submissions" className="relative text-xs bg-slate-50 text-slate-600 font-semibold px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors border border-slate-200">
                <span className="sm:hidden">📋</span>
                <span className="hidden sm:inline">📋 Soumissions</span>
                {newCorrections > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow">
                    {newCorrections}
                  </span>
                )}
              </Link>
            )}
            <Link href="/chat" className="text-xs bg-red-50 text-red-700 font-semibold px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors border border-red-100">
              <span className="sm:hidden">💬</span>
              <span className="hidden sm:inline">💬 Chat IA</span>
            </Link>
            <button onClick={() => { logout(); router.push('/'); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium">
              <span className="sm:hidden">↪</span>
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </nav>

      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]"><Spinner size={36} /></div>
      ) : isNewUser ? (
        /* ════════════════════════════════════════
           NOUVEAU UTILISATEUR — guide de démarrage
           ════════════════════════════════════════ */
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">

          {/* Bienvenue */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-8 text-center">
            <UserAvatar name={user.full_name} size={56} />
            <h1 className="mt-4 text-2xl font-black text-slate-900">Bienvenue, {firstName} 🍁</h1>
            <p className="mt-2 text-slate-500 text-sm max-w-sm mx-auto">
              Tes statistiques apparaîtront ici après ta première session. Voici comment commencer :
            </p>
          </motion.div>

          {/* Étapes */}
          <div className="space-y-3">
            {[
              {
                num: '1',
                title: 'Choisis une épreuve',
                desc: 'Commence par la Compréhension Orale — c\'est la section avec le plus de points au TCF.',
                cta: 'Commencer CO →',
                href: '/practice/CO',
                color: 'border-sky-200 bg-sky-50',
                ctaColor: 'bg-sky-500 hover:bg-sky-600',
              },
              {
                num: '2',
                title: 'Définis ton objectif',
                desc: goalData
                  ? `Objectif défini : ${goalData.label} (NCLC ${goalData.nclc})`
                  : 'Dis-nous ton programme d\'immigration pour qu\'on calcule tes scores cibles.',
                cta: goalData ? 'Modifier →' : 'Définir →',
                href: goalData ? '/settings' : '/onboarding',
                color: goalData ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50',
                ctaColor: goalData ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600',
              },
              {
                num: '3',
                title: 'Utilise le Chat IA',
                desc: 'Pose toutes tes questions sur le TCF Canada, la grammaire ou l\'immigration.',
                cta: 'Ouvrir le chat →',
                href: '/chat',
                color: 'border-indigo-200 bg-indigo-50',
                ctaColor: 'bg-indigo-500 hover:bg-indigo-600',
              },
            ].map((step, i) => (
              <motion.div key={step.num} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
                <div className={`rounded-2xl border p-4 sm:p-5 flex items-center gap-4 ${step.color}`}>
                  <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-base font-black text-slate-700 flex-shrink-0 shadow-sm">
                    {step.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-800 text-sm">{step.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.desc}</div>
                  </div>
                  <Link href={step.href}
                    className={`text-xs font-bold text-white px-3 py-2 rounded-xl transition-colors flex-shrink-0 ${step.ctaColor}`}>
                    {step.cta}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 4 épreuves accessibles */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 px-1">4 épreuves TCF disponibles</div>
            <div className="grid grid-cols-2 gap-3">
              {SECTIONS.map((s, i) => (
                <motion.div key={s.code} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.05 }}>
                  <Link href={`/practice/${s.code}`}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all p-4 group">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-105 transition-transform`}>
                      {s.icon}
                    </div>
                    <div>
                      <div className="font-black text-slate-800 text-sm">{s.code}</div>
                      <div className="text-[11px] text-slate-400 leading-tight">{s.label}</div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>
      ) : (
        /* ════════════════════════════════════════
           UTILISATEUR ACTIF — stats & historique
           ════════════════════════════════════════ */
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 sm:px-8 py-5 sm:py-6 flex items-center gap-4 sm:gap-6">
            <UserAvatar name={user.full_name} size={48} />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">Bonjour, {firstName} 👋</h1>
              <p className="text-slate-400 text-sm mt-0.5">{dashboard?.totalAttempts ?? 0} session{(dashboard?.totalAttempts ?? 0) > 1 ? 's' : ''} · TCF Canada</p>
            </div>
            {dashboard?.globalAverage != null && (
              <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 flex-shrink-0">
                <ScoreRing score={dashboard.globalAverage} size={52} />
                <div className="hidden sm:block">
                  <div className="text-sm font-black text-slate-700">Score moyen</div>
                  <div className="text-xs text-slate-400">{sectionsWithData.length}/4 sections</div>
                </div>
              </div>
            )}
          </motion.div>

          {/* KPI bar — affiché uniquement si données réelles */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="grid grid-cols-3 gap-3">
            {[
              { label: 'Sessions', value: dashboard?.totalAttempts ?? 0, icon: '🎯', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
              { label: 'Score moyen', value: dashboard?.globalAverage != null ? `${Math.round(dashboard.globalAverage)}%` : '—', icon: '📊', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
              { label: 'Sections', value: `${sectionsWithData.length}/4`, icon: '🏆', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' },
            ].map(kpi => (
              <div key={kpi.label} className={`rounded-2xl border p-4 ${kpi.bg} flex flex-col items-center sm:items-start gap-1`}>
                <span className="text-lg">{kpi.icon}</span>
                <div className={`text-xl sm:text-2xl font-black ${kpi.color}`}>{kpi.value}</div>
                <div className="text-[11px] text-slate-500 font-medium">{kpi.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Objectif TCF */}
          {goalData?.scores ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">{goalData.icon}</span>
                  <div>
                    <div className="text-sm font-black text-slate-800">{goalData.label}</div>
                    <div className="text-xs text-slate-400">NCLC {goalData.nclc} minimum requis</div>
                  </div>
                </div>
                <Link href="/settings" className="text-xs text-red-600 hover:underline font-semibold">Modifier</Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {(Object.keys(goalData.scores) as SectionCode[]).map(code => {
                  const target = goalData.scores![code];
                  const stat = dashboard?.stats.find(s => s.section === code);
                  const current = stat?.averageScore ?? null;
                  const achieved = current !== null && target !== null && current >= target.min;
                  const pct = target && current !== null ? Math.min((current / target.min) * 100, 100) : 0;
                  return (
                    <div key={code} className={`rounded-xl p-3 border ${achieved ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'} ${!target ? 'opacity-40' : ''}`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${SECTION_META[code].color} flex items-center justify-center text-xs text-white font-black`}>{code}</div>
                        {achieved && <span className="text-emerald-500 text-xs">✓</span>}
                      </div>
                      {target ? (
                        <>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wide">Objectif</div>
                          <div className="text-base font-black text-slate-800">{target.min}<span className="text-xs font-normal text-slate-400">{target.unit}</span></div>
                          {current !== null && (
                            <div className={`text-xs font-semibold mt-0.5 ${achieved ? 'text-emerald-600' : 'text-orange-500'}`}>
                              Actuel : {current}{target.unit}
                            </div>
                          )}
                          <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-1.5 rounded-full bg-gradient-to-r ${SECTION_META[code].color} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-slate-400 italic mt-1">Non requis</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
              className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-amber-800 text-sm">🎯 Objectif TCF non défini</div>
                <div className="text-xs text-amber-600 mt-0.5">Définis ton programme pour voir tes scores cibles</div>
              </div>
              <Link href="/settings" className="text-xs font-bold bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors flex-shrink-0 ml-4">
                Définir →
              </Link>
            </motion.div>
          )}

          {/* 4 sections */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-slate-800">Continuer à pratiquer</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">4 épreuves TCF</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {SECTIONS.map((s, i) => {
                const stat = dashboard?.stats.find(st => st.section === s.code);
                const hasPracticed = (stat?.attempts ?? 0) > 0;
                const avg = stat?.averageScore != null ? Math.round(stat.averageScore) : null;
                return (
                  <motion.div key={s.code} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.06 }}>
                    <Link href={`/practice/${s.code}`}
                      className="flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all overflow-hidden group">
                      <div className={`bg-gradient-to-r ${s.color} px-4 pt-4 pb-3 flex items-center gap-3`}>
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">{s.icon}</div>
                        <div>
                          <div className="text-white font-black text-sm">{s.code}</div>
                          <div className="text-white/80 text-xs hidden sm:block">{s.label}</div>
                        </div>
                      </div>
                      <div className="px-4 py-3 flex-1 flex flex-col justify-between gap-2">
                        {hasPracticed && avg !== null ? (
                          <>
                            <div>
                              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                <span>{stat?.attempts} session{(stat?.attempts ?? 0) > 1 ? 's' : ''}</span>
                                <span className="font-black text-slate-700">{avg}%</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${avg}%` }}
                                  transition={{ duration: 0.7, delay: 0.2 + i * 0.08 }}
                                  className={`h-full bg-gradient-to-r ${s.color} rounded-full`} />
                              </div>
                            </div>
                            <span className="text-xs font-black text-slate-500 group-hover:text-slate-700 transition-colors">Continuer →</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-slate-400">Pas encore commencé</span>
                            <span className="text-xs font-black text-slate-500 group-hover:text-slate-700 transition-colors">Commencer →</span>
                          </>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Conseils */}
          {recommendations.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-base flex-shrink-0">💡</div>
                <div>
                  <div className="text-sm font-black text-slate-800">Conseils personnalisés</div>
                  <div className="text-xs text-slate-400">Basés sur tes résultats</div>
                </div>
              </div>
              <div className="space-y-2.5">
                {recommendations.map((rec, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.07 }}
                    className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <span className="text-slate-400 font-black text-sm mt-0.5 flex-shrink-0">{i + 1}.</span>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {rec.split('**').map((part, j) =>
                        j % 2 === 1 ? <strong key={j} className="text-slate-900">{part}</strong> : <span key={j}>{part}</span>
                      )}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Graphiques */}
          {(hasRadarData || hasChartData) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {hasRadarData && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100">
                  <div className="text-sm font-black text-slate-800 mb-0.5">Vue d'ensemble</div>
                  <div className="text-xs text-slate-400 mb-4">Scores moyens par section</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="section" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                      <Radar name="Score" dataKey="score" stroke="#dc2626" fill="#dc2626" fillOpacity={0.18} strokeWidth={2} dot={{ r: 4, fill: '#dc2626' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
              {hasChartData && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-100">
                  <div className="text-sm font-black text-slate-800 mb-0.5">Progression</div>
                  <div className="text-xs text-slate-400 mb-4">Évolution de tes scores</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={progressData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        {SECTIONS.map(s => (
                          <linearGradient key={s.code} id={`grad-${s.code}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={s.radarColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={s.radarColor} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                      {SECTIONS.map(s => (
                        <Area key={s.code} type="monotone" dataKey={s.code} name={s.code}
                          stroke={s.radarColor} fill={`url(#grad-${s.code})`} strokeWidth={2}
                          dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </div>
          )}

          {/* Cours */}
          {lessons.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-slate-800">Mes cours</h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{lessons.length} cours</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lessons.map((lesson, i) => {
                  const sectionMeta = SECTION_META[lesson.section as SectionCode] ?? { color: 'from-slate-300 to-slate-400', icon: '📄' };
                  return (
                    <motion.div key={lesson.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                      <Link href={`/lessons/${lesson.id}`}
                        className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-red-200 transition-all group">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${sectionMeta.color} flex items-center justify-center text-white text-base flex-shrink-0`}>
                          {sectionMeta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 text-sm group-hover:text-red-700 transition-colors truncate">{lesson.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{lesson.section} · {new Date(lesson.assignedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}</div>
                        </div>
                        <span className="text-slate-300 group-hover:text-red-500 transition-colors">→</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Historique */}
          {history.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-slate-800">Historique</h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{history.length} session{history.length > 1 ? 's' : ''}</span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                {visibleHistory.map((h, i) => {
                  const hMeta = SECTION_META[h.section as SectionCode];
                  return (
                    <motion.div key={h.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${hMeta?.color ?? 'from-slate-300 to-slate-400'} flex items-center justify-center text-xs font-black text-white flex-shrink-0`}>
                          {h.section}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-700 text-sm">{hMeta?.icon} {hMeta?.label ?? h.section}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5">
                            <span>{new Date(h.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            {h.correct != null && h.total != null && (<><span>·</span><span>{h.correct}/{h.total} bonnes</span></>)}
                          </div>
                        </div>
                      </div>
                      <ScoreRing score={h.score} size={40} />
                    </motion.div>
                  );
                })}
              </div>
              {history.length > 5 && (
                <button onClick={() => setShowAllHistory(v => !v)}
                  className="mt-3 w-full text-xs text-red-600 font-semibold py-2 hover:bg-red-50 rounded-xl transition-colors">
                  {showAllHistory ? '▲ Voir moins' : `▼ Voir les ${history.length - 5} sessions précédentes`}
                </button>
              )}
            </motion.div>
          )}

        </div>
      )}
    </div>
  );
}
