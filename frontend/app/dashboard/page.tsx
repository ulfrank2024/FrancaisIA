'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
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

const SECTION_COLORS: Record<SectionCode, string> = {
  CO: 'from-sky-400 to-cyan-500',
  CE: 'from-violet-400 to-purple-500',
  EE: 'from-emerald-400 to-teal-500',
  EO: 'from-rose-400 to-pink-500',
};

const SECTIONS = [
  { code: 'CO', label: 'Compréhension Orale', icon: '🎧', color: 'from-sky-400 to-cyan-500', bg: 'bg-sky-50', border: 'border-sky-200' },
  { code: 'CE', label: 'Compréhension Écrite', icon: '📖', color: 'from-violet-400 to-purple-500', bg: 'bg-violet-50', border: 'border-violet-200' },
  { code: 'EE', label: 'Expression Écrite', icon: '✍️', color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { code: 'EO', label: 'Expression Orale', icon: '🎤', color: 'from-rose-400 to-pink-500', bg: 'bg-rose-50', border: 'border-rose-200' },
];

function getMood(avg: number | null): AvatarMood {
  if (!avg) return 'idle';
  if (avg >= 80) return 'celebrate';
  if (avg >= 60) return 'happy';
  return 'encourage';
}

export default function DashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const meta = clerkUser?.unsafeMetadata as { goal?: string; program?: string; completedOnboarding?: boolean } | undefined;
  const goalData = meta?.program ? GOAL_SCORES[meta.program] : meta?.goal === 'citizenship' ? GOAL_SCORES['citizenship'] : null;

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.progress.dashboard(user.id), api.progress.history(user.id)])
      .then(([dash, hist]) => {
        setDashboard(dash);
        setHistory(hist.history.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size={40} />
    </div>
  );

  const mood = getMood(dashboard?.globalAverage ?? null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent flex-shrink-0">FrançaisIA</span>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <span className="text-sm text-slate-600 font-medium truncate max-w-[80px] sm:max-w-none hidden xs:block">
              {user.full_name.split(' ')[0]}
            </span>
            <Link href="/chat" className="text-xs sm:text-sm bg-indigo-50 text-indigo-700 font-semibold px-2 sm:px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors flex-shrink-0">
              <span className="sm:hidden">💬</span>
              <span className="hidden sm:inline">💬 Chat IA</span>
            </Link>
            <button onClick={() => { logout(); router.push('/'); }} className="text-xs sm:text-sm text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
              <span className="sm:hidden">↪</span>
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-10">
        {/* Header avec Sophie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center gap-6 md:gap-8 bg-white rounded-3xl p-5 sm:p-8 shadow-md border border-slate-100"
        >
          <SophieAvatar mood={mood} size="md" showMessage={true} />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-black text-slate-800">Bonjour, {user.full_name.split(' ')[0]} 👋</h1>
            <p className="text-slate-500 mt-1">Voici ton tableau de bord TCF Canada</p>
            {dashboard?.globalAverage !== null && (
              <div className="mt-4 inline-flex items-center gap-3 bg-indigo-50 rounded-2xl px-5 py-3">
                <ScoreRing score={dashboard?.globalAverage ?? 0} size={72} />
                <div>
                  <div className="text-sm text-slate-500">Score global moyen</div>
                  <div className="text-xs text-slate-400">{dashboard?.totalAttempts} exercice(s) complété(s)</div>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/practice/mock-exam"
              className="bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold px-6 py-3 rounded-xl shadow hover:shadow-md transition-all text-center whitespace-nowrap"
            >
              🎯 Examen complet
            </Link>
          </div>
        </motion.div>

        {/* Scores cibles TCF selon l'objectif */}
        {goalData && goalData.scores ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-3xl p-6 shadow-md border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{goalData.icon}</span>
                  <h2 className="text-base font-black text-slate-800">Tes scores TCF cibles</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{goalData.label} · NCLC {goalData.nclc} minimum requis</p>
              </div>
              <Link href="/onboarding" className="text-xs text-indigo-600 hover:underline font-semibold">Modifier</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(goalData.scores) as SectionCode[]).map(code => {
                const target = goalData.scores![code];
                const stat = dashboard?.stats.find(s => s.section === code);
                const current = stat?.averageScore ?? null;
                const achieved = current !== null && target !== null && current >= target.min;
                return (
                  <div key={code} className={`rounded-2xl p-4 border-2 ${achieved ? 'border-emerald-200 bg-emerald-50' : target ? 'border-slate-100 bg-slate-50' : 'border-slate-100 bg-slate-50 opacity-50'}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${SECTION_COLORS[code]} flex items-center justify-center text-xs text-white font-black`}>{code}</div>
                      {achieved && <span className="text-emerald-500 text-xs">✓</span>}
                    </div>
                    {target ? (
                      <>
                        <div className="text-xs text-slate-500">Objectif</div>
                        <div className="text-lg font-black text-slate-800">{target.min}<span className="text-xs font-normal text-slate-400">{target.unit}</span></div>
                        {current !== null && (
                          <div className={`text-xs font-semibold mt-1 ${achieved ? 'text-emerald-600' : 'text-orange-500'}`}>
                            Actuel : {current}{target.unit}
                          </div>
                        )}
                        <div className="mt-1.5 h-1 bg-slate-200 rounded-full">
                          <div className={`h-1 rounded-full bg-gradient-to-r ${SECTION_COLORS[code]}`} style={{ width: current !== null ? `${Math.min((current / target.min) * 100, 100)}%` : '0%' }} />
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 italic">Non requis</div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : meta?.completedOnboarding === false || !meta?.completedOnboarding ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 flex items-center justify-between"
          >
            <div>
              <div className="font-bold text-indigo-800 text-sm">🎯 Définis ton objectif TCF Canada</div>
              <div className="text-xs text-indigo-600 mt-0.5">Sophie calculera tes scores minimum à atteindre</div>
            </div>
            <Link href="/onboarding" className="text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors flex-shrink-0 ml-4">
              Définir →
            </Link>
          </motion.div>
        ) : null}

        {/* Sections TCF */}
        <div>
          <h2 className="text-xl font-black text-slate-800 mb-5">Pratiquer une compétence</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SECTIONS.map((s, i) => {
              const stat = dashboard?.stats.find(st => st.section === s.code);
              return (
                <motion.div
                  key={s.code}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -3, scale: 1.02 }}
                >
                  <Link
                    href={`/practice/${s.code}`}
                    className={`flex flex-col gap-4 ${s.bg} border ${s.border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all block`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl shadow`}>
                      {s.icon}
                    </div>
                    <div>
                      <div className="font-black text-slate-800">{s.code}</div>
                      <div className="text-xs text-slate-500">{s.label}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      {stat?.averageScore !== null && stat?.averageScore !== undefined ? (
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

        {/* Historique */}
        {loading ? (
          <div className="flex justify-center py-8"><Spinner size={32} /></div>
        ) : history.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <h2 className="text-xl font-black text-slate-800 mb-5">Dernières activités</h2>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
              {history.map((h, i) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-lg font-black text-indigo-600">
                      {h.section}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 text-sm">Section {h.section}</div>
                      <div className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleDateString('fr-CA')}</div>
                    </div>
                  </div>
                  <ScoreRing score={h.score} size={44} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
