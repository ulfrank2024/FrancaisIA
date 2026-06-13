'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SophieAvatar, { AvatarMood } from '../../components/SophieAvatar';
import ScoreRing from '../../components/ScoreRing';
import Spinner from '../../components/Spinner';
import { api, DashboardData, HistoryItem } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

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
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-xl font-black bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">FrançaisIA</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 font-medium">{user.full_name}</span>
            <Link href="/chat" className="text-sm bg-indigo-50 text-indigo-700 font-semibold px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
              💬 Chat IA
            </Link>
            <button onClick={() => { logout(); router.push('/'); }} className="text-sm text-slate-400 hover:text-red-500 transition-colors">
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Header avec Sophie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center gap-8 bg-white rounded-3xl p-8 shadow-md border border-slate-100"
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
                  className="flex items-center justify-between px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-lg font-black text-indigo-600">
                      {h.section}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 text-sm">Section {h.section}</div>
                      <div className="text-xs text-slate-400">{new Date(h.created_at).toLocaleDateString('fr-CA')}</div>
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
