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
import { api, DashboardData, HistoryItem } from '../../lib/api';
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
    recs.push('Excellent niveau ! Passe à l\'examen complet simulé pour tester ta résistance sur 4 sections.');
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
  return Object.entries(byDate).slice(-10).map(([date, secs]) => {
    const entry: Record<string, number | string> = { date };
    Object.entries(secs).forEach(([s, scores]) => {
      entry[s] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    });
    return entry;
  });
}

export default function DashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  const meta = clerkUser?.unsafeMetadata as { goal?: string; program?: string; completedOnboarding?: boolean } | undefined;
  const goalData = meta?.program ? GOAL_SCORES[meta.program] : meta?.goal === 'citizenship' ? GOAL_SCORES['citizenship'] : null;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    // Redirection automatique selon le rôle / onboarding
    if (clerkUser && !clerkUser.unsafeMetadata?.completedOnboarding) {
      router.replace('/onboarding');
      return;
    }
    const role = clerkUser?.unsafeMetadata?.role as string | undefined;
    if (role === 'professeur') { router.replace('/prof/dashboard'); return; }
    if (role === 'pending_prof') { router.replace('/pending-approval'); return; }
  }, [user, clerkUser, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.progress.dashboard(user.id), api.progress.history(user.id)])
      .then(([dash, hist]) => {
        setDashboard(dash);
        setHistory(hist.history);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center"><Spinner size={40} /></div>
  );

  const mood = getMood(dashboard?.globalAverage ?? null);
  const recommendations = buildRecommendations(dashboard, goalData);
  const progressData = buildProgressData(history);
  const visibleHistory = showAllHistory ? history : history.slice(0, 5);

  const radarData = SECTIONS.map(s => {
    const stat = dashboard?.stats.find(x => x.section === s.code);
    return { section: s.code, score: stat?.averageScore ?? 0, fullMark: 100 };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent flex-shrink-0">FrançaisIA</span>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-sm text-slate-600 font-medium hidden sm:block">{user.full_name.split(' ')[0]}</span>
            <Link href="/chat" className="text-xs sm:text-sm bg-indigo-50 text-indigo-700 font-semibold px-2 sm:px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
              <span className="sm:hidden">💬</span>
              <span className="hidden sm:inline">💬 Chat IA</span>
            </Link>
            <button onClick={() => { logout(); router.push('/'); }} className="text-xs sm:text-sm text-slate-400 hover:text-red-500 transition-colors">
              <span className="sm:hidden">↪</span>
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {/* Header Sophie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center gap-6 bg-white rounded-3xl p-5 sm:p-8 shadow-md border border-slate-100">
          <SophieAvatar mood={mood} size="md" showMessage={true} />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800">Bonjour, {user.full_name.split(' ')[0]} 👋</h1>
            <p className="text-slate-500 mt-1 text-sm">Voici ton tableau de bord TCF Canada</p>
            {dashboard?.globalAverage != null && (
              <div className="mt-4 inline-flex items-center gap-3 bg-indigo-50 rounded-2xl px-5 py-3">
                <ScoreRing score={dashboard.globalAverage} size={64} />
                <div>
                  <div className="text-sm font-bold text-slate-700">Score global moyen</div>
                  <div className="text-xs text-slate-400">{dashboard.totalAttempts} exercice(s) complété(s)</div>
                </div>
              </div>
            )}
          </div>
          <Link href="/practice/mock-exam"
            className="bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold px-6 py-3 rounded-xl shadow hover:shadow-md transition-all text-center whitespace-nowrap text-sm">
            🎯 Examen complet
          </Link>
        </motion.div>

        {/* Scores cibles */}
        {goalData?.scores ? (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{goalData.icon}</span>
                  <h2 className="text-base font-black text-slate-800">Scores TCF cibles</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{goalData.label} · NCLC {goalData.nclc} minimum requis</p>
              </div>
              <Link href="/settings" className="text-xs text-indigo-600 hover:underline font-semibold">Modifier</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(goalData.scores) as SectionCode[]).map(code => {
                const target = goalData.scores![code];
                const stat = dashboard?.stats.find(s => s.section === code);
                const current = stat?.averageScore ?? null;
                const achieved = current !== null && target !== null && current >= target.min;
                const pct = target && current !== null ? Math.min((current / target.min) * 100, 100) : 0;
                return (
                  <div key={code} className={`rounded-2xl p-4 border-2 ${achieved ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'} ${!target ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${SECTION_META[code].color} flex items-center justify-center text-xs text-white font-black`}>{code}</div>
                      {achieved && <span className="text-emerald-500 text-xs font-bold">✓</span>}
                    </div>
                    {target ? (
                      <>
                        <div className="text-xs text-slate-500">Objectif min.</div>
                        <div className="text-lg font-black text-slate-800">{target.min}<span className="text-xs font-normal text-slate-400">{target.unit}</span></div>
                        {current !== null && (
                          <div className={`text-xs font-semibold mt-1 ${achieved ? 'text-emerald-600' : 'text-orange-500'}`}>
                            Actuel : {current}{target.unit}
                          </div>
                        )}
                        <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-1.5 rounded-full bg-gradient-to-r ${SECTION_META[code].color} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-right text-xs text-slate-400 mt-0.5">{Math.round(pct)}%</div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 italic mt-2">Non requis</div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : !meta?.completedOnboarding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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

        {/* Graphiques : Radar + Courbe progression */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar spider */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-100">
              <h2 className="text-base font-black text-slate-800 mb-1">Vue d'ensemble par compétence</h2>
              <p className="text-xs text-slate-400 mb-4">Scores moyens sur 100 par section</p>
              {radarData.some(d => d.score > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="section" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                    <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center text-slate-300 gap-2">
                  <span className="text-4xl">📊</span>
                  <p className="text-sm">Complète des exercices pour voir le graphique</p>
                </div>
              )}
            </motion.div>

            {/* Courbe progression */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-100">
              <h2 className="text-base font-black text-slate-800 mb-1">Progression dans le temps</h2>
              <p className="text-xs text-slate-400 mb-4">Évolution de tes scores par session</p>
              {progressData.length >= 2 ? (
                <ResponsiveContainer width="100%" height={240}>
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
              ) : (
                <div className="h-[240px] flex flex-col items-center justify-center text-slate-300 gap-2">
                  <span className="text-4xl">📈</span>
                  <p className="text-sm text-center">Complète au moins 2 sessions pour voir ta progression</p>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Recommandations personnalisées */}
        {recommendations.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-indigo-50 to-cyan-50 rounded-3xl p-5 sm:p-6 border border-indigo-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-sm font-black">
                ✨
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800">Recommandations de Sophie</h2>
                <p className="text-xs text-slate-500">Basées sur tes résultats et ton objectif</p>
              </div>
            </div>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.07 }}
                  className="flex items-start gap-3 bg-white/70 backdrop-blur rounded-2xl px-4 py-3">
                  <span className="text-indigo-500 font-black text-sm mt-0.5 flex-shrink-0">{i + 1}.</span>
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

        {/* Sections TCF — pratiquer */}
        <div>
          <h2 className="text-xl font-black text-slate-800 mb-4">Pratiquer une compétence</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SECTIONS.map((s, i) => {
              const stat = dashboard?.stats.find(st => st.section === s.code);
              return (
                <motion.div key={s.code} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }} whileHover={{ y: -3, scale: 1.02 }}>
                  <Link href={`/practice/${s.code}`}
                    className={`flex flex-col gap-4 ${s.bg} border ${s.border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all block`}>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl shadow`}>
                      {s.icon}
                    </div>
                    <div>
                      <div className="font-black text-slate-800">{s.code}</div>
                      <div className="text-xs text-slate-500">{s.label}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      {stat?.averageScore != null ? (
                        <ScoreRing score={stat.averageScore} size={48} />
                      ) : (
                        <span className="text-xs text-slate-400 italic">Pas encore pratiqué</span>
                      )}
                      <span className="text-xs text-slate-400">{stat?.attempts ?? 0} essai(s)</span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Historique des sessions */}
        {loading ? (
          <div className="flex justify-center py-8"><Spinner size={32} /></div>
        ) : history.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-800">Historique des sessions</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{history.length} session(s)</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
              {visibleHistory.map((h, i) => {
                const meta = SECTION_META[h.section as SectionCode];
                return (
                  <motion.div key={h.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta?.color ?? 'from-slate-300 to-slate-400'} flex items-center justify-center text-sm font-black text-white shadow-sm`}>
                        {h.section}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700 text-sm">
                          {meta?.icon} {meta?.label ?? `Section ${h.section}`}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span>{new Date(h.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {h.correct != null && h.total != null && (
                            <span className="text-slate-300">·</span>
                          )}
                          {h.correct != null && h.total != null && (
                            <span>{h.correct}/{h.total} bonnes réponses</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ScoreRing score={h.score} size={44} />
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
