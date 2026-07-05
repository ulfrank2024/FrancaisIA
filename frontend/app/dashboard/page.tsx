'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import ScoreRing from '../../components/ScoreRing';
import Spinner from '../../components/Spinner';
import { api, DashboardData, HistoryItem, LessonAssigned } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

type SectionCode = 'CO' | 'CE' | 'EE' | 'EO';


const SECTION_META: Record<SectionCode, { label: string; icon: string; color: string; radarColor: string; bg: string; border: string }> = {
  CO: { label: 'Compréhension Orale',  icon: '🎧', color: 'from-sky-400 to-cyan-500',      radarColor: '#0ea5e9', bg: 'bg-sky-50',     border: 'border-sky-200' },
  CE: { label: 'Compréhension Écrite', icon: '📖', color: 'from-violet-400 to-purple-500',  radarColor: '#8b5cf6', bg: 'bg-violet-50',  border: 'border-violet-200' },
  EE: { label: 'Expression Écrite',    icon: '✍️', color: 'from-emerald-400 to-teal-500',   radarColor: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  EO: { label: 'Expression Orale',     icon: '🎤', color: 'from-rose-400 to-pink-500',      radarColor: '#f43f5e', bg: 'bg-rose-50',    border: 'border-rose-200' },
};

const SECTIONS = Object.entries(SECTION_META).map(([code, m]) => ({ code: code as SectionCode, ...m }));


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

  const visibleHistory = showAllHistory ? history : history.slice(0, 5);

  const firstName = user.full_name.split(' ')[0];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">

        {/* Salutation + score global si données */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Bonjour, {firstName} 👋</h1>
            <p className="text-slate-400 text-sm mt-0.5">Choisis une épreuve et pratique.</p>
          </div>
          {dashboard?.globalAverage != null && !loading && (
            <div className="flex items-center gap-2.5 bg-white rounded-2xl px-4 py-2.5 border border-slate-100 shadow-sm">
              <ScoreRing score={dashboard.globalAverage} size={44} />
              <div className="hidden sm:block">
                <div className="text-xs font-black text-slate-700">Score moyen</div>
                <div className="text-[11px] text-slate-400">{dashboard.totalAttempts} session{dashboard.totalAttempts > 1 ? 's' : ''}</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* 4 épreuves — toujours visibles, héros du dashboard */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={36} /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SECTIONS.map((s, i) => {
              const stat = dashboard?.stats.find(st => st.section === s.code);
              const hasPracticed = (stat?.attempts ?? 0) > 0;
              const avg = stat?.averageScore != null ? Math.round(stat.averageScore) : null;
              return (
                <motion.div key={s.code} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}>
                  <Link href={`/practice/${s.code}`}
                    className="flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all overflow-hidden group h-full">
                    {/* Bande colorée */}
                    <div className={`bg-gradient-to-r ${s.color} px-5 pt-5 pb-4 flex items-center gap-4`}>
                      <div className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-sm">
                        {s.icon}
                      </div>
                      <div>
                        <div className="text-white/70 text-xs font-bold uppercase tracking-wider">{s.code}</div>
                        <div className="text-white font-black text-base leading-tight">{s.label}</div>
                      </div>
                    </div>
                    {/* Corps */}
                    <div className="px-5 py-4 flex-1 flex flex-col justify-between gap-3">
                      {hasPracticed && avg !== null ? (
                        <>
                          <div>
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                              <span>{stat?.attempts} session{(stat?.attempts ?? 0) > 1 ? 's' : ''}</span>
                              <span className="font-black text-slate-800 text-sm">{avg}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${avg}%` }}
                                transition={{ duration: 0.8, delay: 0.15 + i * 0.1, ease: 'easeOut' }}
                                className={`h-full bg-gradient-to-r ${s.color} rounded-full`}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-black text-slate-400 group-hover:text-slate-700 transition-colors">
                            Continuer →
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-slate-400">Pas encore commencé</span>
                          <span className="text-sm font-black text-slate-400 group-hover:text-slate-700 transition-colors">
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
        )}

        {/* Historique compact — seulement si données */}
        {!loading && history.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-slate-700">Dernières sessions</h2>
              <span className="text-xs text-slate-400">{history.length} au total</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
              {visibleHistory.map((h, i) => {
                const hMeta = SECTION_META[h.section as SectionCode];
                return (
                  <div key={h.id} className="flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${hMeta?.color ?? 'from-slate-300 to-slate-400'} flex items-center justify-center text-xs font-black text-white flex-shrink-0`}>
                        {h.section}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700 text-sm">{hMeta?.label ?? h.section}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(h.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                          {h.correct != null && h.total != null && ` · ${h.correct}/${h.total} bonnes`}
                        </div>
                      </div>
                    </div>
                    <ScoreRing score={h.score} size={38} />
                  </div>
                );
              })}
            </div>
            {history.length > 5 && (
              <button onClick={() => setShowAllHistory(v => !v)}
                className="mt-2 w-full text-xs text-slate-500 font-semibold py-2 hover:bg-slate-100 rounded-xl transition-colors">
                {showAllHistory ? '▲ Voir moins' : `▼ ${history.length - 5} sessions de plus`}
              </button>
            )}
          </motion.div>
        )}

        {/* Cours assignés */}
        {!loading && lessons.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-slate-700">Mes cours</h2>
              <span className="text-xs text-slate-400">{lessons.length} cours</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lessons.map((lesson) => {
                const sectionMeta = SECTION_META[lesson.section as SectionCode] ?? { color: 'from-slate-300 to-slate-400', icon: '📄' };
                return (
                  <Link key={lesson.id} href={`/lessons/${lesson.id}`}
                    className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-slate-100 hover:border-red-200 hover:shadow-md transition-all group">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sectionMeta.color} flex items-center justify-center text-white text-base flex-shrink-0`}>
                      {sectionMeta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm group-hover:text-red-700 transition-colors truncate">{lesson.title}</div>
                      <div className="text-xs text-slate-400">{lesson.section} · {new Date(lesson.assignedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <span className="text-slate-300 group-hover:text-red-500 transition-colors text-sm">→</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
