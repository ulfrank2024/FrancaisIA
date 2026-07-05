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
import SophieAvatar, { AvatarMood } from '../../components/SophieAvatar';
import ScoreRing from '../../components/ScoreRing';
import Spinner from '../../components/Spinner';
import { api, DashboardData, HistoryItem, LessonAssigned } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

type SectionCode = 'CO' | 'CE' | 'EE' | 'EO';
type ScoreTarget = { min: number; max: number; unit: string; nclc: number };

const GOAL_SCORES: Record<string, { label: string; icon: string; color: string; nclc: number | null; scores: Record<SectionCode, ScoreTarget | null> | null }> = {
  fsw:    { label: 'Entrée Express FSW',     icon: '🌟', color: 'indigo', nclc: 7, scores: { CO: { min: 458, max: 699, unit: '/699', nclc: 7 }, CE: { min: 453, max: 699, unit: '/699', nclc: 7 }, EE: { min: 10, max: 20, unit: '/20', nclc: 7 }, EO: { min: 10, max: 20, unit: '/20', nclc: 7 } } },
  cec_ab: { label: 'Entrée Express CEC 0/A', icon: '🍁', color: 'red',    nclc: 7, scores: { CO: { min: 458, max: 699, unit: '/699', nclc: 7 }, CE: { min: 453, max: 699, unit: '/699', nclc: 7 }, EE: { min: 10, max: 20, unit: '/20', nclc: 7 }, EO: { min: 10, max: 20, unit: '/20', nclc: 7 } } },
  cec_b:  { label: 'Entrée Express CEC B',   icon: '🔧', color: 'orange', nclc: 5, scores: { CO: { min: 369, max: 699, unit: '/699', nclc: 5 }, CE: { min: 375, max: 699, unit: '/699', nclc: 5 }, EE: { min: 6,  max: 20, unit: '/20', nclc: 5 }, EO: { min: 6,  max: 20, unit: '/20', nclc: 5 } } },
  pnp:    { label: 'PNP Provincial',         icon: '🏙️', color: 'teal',   nclc: 4, scores: { CO: { min: 331, max: 699, unit: '/699', nclc: 4 }, CE: { min: 342, max: 699, unit: '/699', nclc: 4 }, EE: { min: 4,  max: 20, unit: '/20', nclc: 4 }, EO: { min: 4,  max: 20, unit: '/20', nclc: 4 } } },
  peq:    { label: 'Québec PEQ',             icon: '🌺', color: 'sky',    nclc: 7, scores: { CO: { min: 458, max: 699, unit: '/699', nclc: 7 }, CE: { min: 453, max: 699, unit: '/699', nclc: 7 }, EE: { min: 10, max: 20, unit: '/20', nclc: 7 }, EO: { min: 10, max: 20, unit: '/20', nclc: 7 } } },
  citizenship: { label: 'Citoyenneté',       icon: '🏛️', color: 'rose',   nclc: 4, scores: { CO: { min: 331, max: 699, unit: '/699', nclc: 4 }, CE: null, EE: null, EO: { min: 4, max: 20, unit: '/20', nclc: 4 } } },
};

const SECTION_META: Record<SectionCode, { label: string; icon: string; color: string; radarColor: string; bg: string; border: string }> = {
  CO: { label: 'Compréhension Orale',  icon: '🎧', color: 'from-sky-400 to-cyan-500',      radarColor: '#0ea5e9', bg: 'bg-sky-50',     border: 'border-sky-200' },
  CE: { label: 'Compréhension Écrite', icon: '📖', color: 'from-violet-400 to-purple-500',  radarColor: '#8b5cf6', bg: 'bg-violet-50',  border: 'border-violet-200' },
  EE: { label: 'Expression Écrite',    icon: '✍️', color: 'from-emerald-400 to-teal-500',   radarColor: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  EO: { label: 'Expression Orale',     icon: '🎤', color: 'from-rose-400 to-pink-500',      radarColor: '#f43f5e', bg: 'bg-rose-50',    border: 'border-rose-200' },
};

const SECTIONS = Object.entries(SECTION_META).map(([code, m]) => ({ code: code as SectionCode, ...m }));

function getMood(avg: number | null): AvatarMood {
  if (!avg) return 'idle';
  if (avg >= 80) return 'celebrate';
  if (avg >= 60) return 'happy';
  return 'encourage';
}

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
      recs.push(`Bravo ! Tu atteins les objectifs de toutes les sections. Continue à t'entraîner pour consolider tes scores.`);
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

  const mood = getMood(dashboard?.globalAverage ?? null);
  const recommendations = buildRecommendations(dashboard, goalData);
  const progressData = buildProgressData(history);
  const visibleHistory = showAllHistory ? history : history.slice(0, 5);
  const hasChartData = progressData.length >= 2;

  const radarData = SECTIONS.map(s => {
    const stat = dashboard?.stats.find(x => x.section === s.code);
    return { section: s.code, score: stat?.averageScore ?? 0, fullMark: 100 };
  });
  const hasRadarData = radarData.some(d => d.score > 0);

  const firstName = user.full_name.split(' ')[0];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <span className="text-lg font-black bg-gradient-to-r text-slate-900">🍁 RéussirTCF</span>
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
            <Link href="/chat" className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-100">
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* ── Hero compact ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 sm:px-8 py-5 sm:py-6 flex items-center gap-4 sm:gap-6">
          <SophieAvatar mood={mood} size="sm" showMessage={false} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Bonjour, {firstName} 👋</h1>
            <p className="text-slate-400 text-sm mt-0.5">Tableau de bord TCF Canada</p>
          </div>
          {dashboard?.globalAverage != null && (
            <div className="flex items-center gap-3 bg-indigo-50 rounded-2xl px-4 py-3 flex-shrink-0">
              <ScoreRing score={dashboard.globalAverage} size={52} />
              <div className="hidden sm:block">
                <div className="text-sm font-black text-slate-700">Score moyen</div>
                <div className="text-xs text-slate-400">{dashboard.totalAttempts} session{dashboard.totalAttempts > 1 ? 's' : ''}</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Objectif TCF (onboarding CTA si pas défini) ─────────── */}
        {goalData?.scores ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base">{goalData.icon}</span>
                <div>
                  <div className="text-sm font-black text-slate-800">{goalData.label}</div>
                  <div className="text-xs text-slate-400">NCLC {goalData.nclc} minimum requis</div>
                </div>
              </div>
              <Link href="/settings" className="text-xs text-indigo-600 hover:underline font-semibold flex-shrink-0">Modifier</Link>
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
                      {achieved && <span className="text-emerald-500 text-xs font-bold">✓</span>}
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
        ) : !meta?.completedOnboarding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
            className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 flex items-center justify-between">
            <div>
              <div className="font-bold text-indigo-800 text-sm">🎯 Définis ton objectif TCF Canada</div>
              <div className="text-xs text-indigo-600 mt-0.5">Sophie calculera tes scores minimum à atteindre</div>
            </div>
            <Link href="/onboarding" className="text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors flex-shrink-0 ml-4">
              Définir →
            </Link>
          </motion.div>
        )}

        {/* ── 4 Sections TCF — grille 2×2 ─────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-slate-800">Pratiquer une compétence</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">4 épreuves TCF</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {SECTIONS.map((s, i) => {
              const stat = dashboard?.stats.find(st => st.section === s.code);
              const hasPracticed = (stat?.attempts ?? 0) > 0;
              const avg = stat?.averageScore != null ? Math.round(stat.averageScore) : null;
              return (
                <motion.div key={s.code} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06 }}>
                  <Link href={`/practice/${s.code}`}
                    className="flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all overflow-hidden group">
                    {/* Gradient top strip */}
                    <div className={`bg-gradient-to-r ${s.color} px-4 pt-4 pb-3 flex items-center gap-3`}>
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                        {s.icon}
                      </div>
                      <div>
                        <div className="text-white font-black text-sm">{s.code}</div>
                        <div className="text-white/80 text-xs leading-tight hidden sm:block">{s.label}</div>
                      </div>
                    </div>
                    {/* Body */}
                    <div className="px-4 py-3 flex-1 flex flex-col justify-between gap-2">
                      {hasPracticed && avg !== null ? (
                        <>
                          <div>
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                              <span>{stat?.attempts} session{(stat?.attempts ?? 0) > 1 ? 's' : ''}</span>
                              <span className="font-black text-slate-700">{avg}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${avg}%` }}
                                transition={{ duration: 0.7, delay: 0.2 + i * 0.08 }}
                                className={`h-full bg-gradient-to-r ${s.color} rounded-full`}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-black text-slate-500 group-hover:text-slate-700 transition-colors">
                            Continuer →
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-slate-400">Pas encore commencé</span>
                          <span className="text-xs font-black text-slate-500 group-hover:text-slate-700 transition-colors">
                            Commencer →
                          </span>
                        </>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Recommandations Sophie ───────────────────────────────── */}
        {recommendations.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-indigo-50 to-cyan-50 rounded-2xl p-5 sm:p-6 border border-indigo-100">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-sm font-black flex-shrink-0">✨</div>
              <div>
                <div className="text-sm font-black text-slate-800">Recommandations de Sophie</div>
                <div className="text-xs text-slate-500">Basées sur tes résultats</div>
              </div>
            </div>
            <div className="space-y-2.5">
              {recommendations.map((rec, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.07 }}
                  className="flex items-start gap-3 bg-white/70 rounded-xl px-4 py-3">
                  <span className="text-indigo-400 font-black text-sm mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {rec.split('**').map((part, j) =>
                      j % 2 === 1 ? <strong key={j} className="text-indigo-700">{part}</strong> : <span key={j}>{part}</span>
                    )}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Graphiques (seulement si données) ───────────────────── */}
        {!loading && (hasRadarData || hasChartData) && (
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
                    <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
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

        {/* ── Cours assignés par le prof ───────────────────────────── */}
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
                      className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all group">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${sectionMeta.color} flex items-center justify-center text-white text-base flex-shrink-0 shadow-sm`}>
                        {sectionMeta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors truncate">{lesson.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{lesson.section} · Assigné le {new Date(lesson.assignedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}</div>
                      </div>
                      <span className="text-slate-300 group-hover:text-indigo-500 transition-colors">→</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Historique ───────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-8"><Spinner size={32} /></div>
        ) : history.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-slate-800">Historique des sessions</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{history.length} session{history.length > 1 ? 's' : ''}</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
              {visibleHistory.map((h, i) => {
                const hMeta = SECTION_META[h.section as SectionCode];
                return (
                  <motion.div key={h.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${hMeta?.color ?? 'from-slate-300 to-slate-400'} flex items-center justify-center text-xs font-black text-white shadow-sm flex-shrink-0`}>
                        {h.section}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700 text-sm">{hMeta?.icon} {hMeta?.label ?? `Section ${h.section}`}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                          <span>{new Date(h.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {h.correct != null && h.total != null && (
                            <><span>·</span><span>{h.correct}/{h.total} bonnes</span></>
                          )}
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
                className="mt-3 w-full text-xs text-indigo-600 font-semibold py-2 hover:bg-indigo-50 rounded-xl transition-colors">
                {showAllHistory ? '▲ Voir moins' : `▼ Voir les ${history.length - 5} sessions précédentes`}
              </button>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}
