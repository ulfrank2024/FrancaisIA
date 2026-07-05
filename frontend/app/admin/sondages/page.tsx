'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import AdminNav from '../../../components/AdminNav';
import Spinner from '../../../components/Spinner';
import { useAuth } from '../../../lib/auth-context';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
function isAdmin(id: string) { return id === process.env.NEXT_PUBLIC_ADMIN_USER_ID; }

async function getClerkToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try { return await (window as any).Clerk?.session?.getToken() ?? null; } catch { return null; }
}

type Survey = {
  id: string; userId: string; section: string; resultId?: string;
  rating: number; comment?: string; createdAt: string;
};
type SectionStat = { section: string; _avg: { rating: number }; _count: number };
type Dist = { rating: number; count: number };

const SECTION_COLOR: Record<string, string> = {
  CO: 'from-sky-400 to-cyan-500',
  CE: 'from-violet-400 to-purple-500',
  EE: 'from-emerald-400 to-teal-500',
  EO: 'from-rose-400 to-pink-500',
};
const STARS = '★★★★★';

export default function SondagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData]       = useState<{ surveys: Survey[]; stats: SectionStat[]; globalAvg: number | null; dist: Dist[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<string>('');

  useEffect(() => {
    if (!authLoading && user && !isAdmin(user.id)) router.push('/dashboard');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !isAdmin(user.id)) return;
    (async () => {
      const token = await getClerkToken();
      const res = await fetch(`${BASE}/api/admin/surveys`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setData(await res.json());
      setLoading(false);
    })();
  }, [user]);

  if (authLoading || loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Spinner size={40} /></div>
  );

  const filtered = (data?.surveys ?? []).filter(s => !filter || s.section === filter);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <AdminNav />
      <div className="flex-1 min-w-0 px-4 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black">Sondages ⭐</h1>
          <p className="text-slate-400 text-sm mt-0.5">{data?.total ?? 0} réponses · Note moyenne : {data?.globalAvg ? data.globalAvg.toFixed(1) : '–'} / 5</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(data?.stats ?? []).map((s, i) => (
            <motion.div key={s.section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${SECTION_COLOR[s.section] ?? 'from-slate-400 to-slate-500'} flex items-center justify-center text-sm font-black mb-3`}>
                {s.section}
              </div>
              <div className="text-2xl font-black text-white">{s._avg.rating?.toFixed(1) ?? '–'}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s._count} réponse{s._count > 1 ? 's' : ''}</div>
            </motion.div>
          ))}

          {/* Note globale */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 col-span-2 sm:col-span-1">
            <div className="text-xs text-slate-400 mb-1">⭐ Note globale</div>
            <div className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
              {data?.globalAvg ? data.globalAvg.toFixed(1) : '–'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">sur 5 · {data?.total} avis</div>
          </motion.div>
        </div>

        {/* Distribution des notes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-black text-slate-300 mb-4">Distribution des notes</h2>
          <div className="space-y-2.5">
            {(data?.dist ?? []).slice().reverse().map(d => {
              const pct = data?.total ? Math.round((d.count / data.total) * 100) : 0;
              return (
                <div key={d.rating} className="flex items-center gap-3">
                  <span className="text-xs font-black text-amber-400 w-16 flex-shrink-0">
                    {STARS.slice(0, d.rating)}
                  </span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                      className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500" />
                  </div>
                  <span className="text-xs text-slate-400 w-20 text-right flex-shrink-0">{d.count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filtre section */}
        <div className="flex gap-2 flex-wrap">
          {['', 'CO', 'CE', 'EE', 'EO'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === s ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {s || 'Toutes'}
            </button>
          ))}
        </div>

        {/* Liste des sondages */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/60">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-600">
              <div className="text-4xl mb-3">⭐</div>
              <p>Aucun sondage pour l&apos;instant.</p>
            </div>
          ) : filtered.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="flex items-start gap-4 px-5 py-4 hover:bg-slate-800/20 transition-colors">
              {/* Avatar */}
              <img src={`https://api.dicebear.com/9.x/personas/svg?seed=${s.userId}`} className="w-9 h-9 rounded-xl border border-slate-700 flex-shrink-0" alt="" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md bg-gradient-to-r ${SECTION_COLOR[s.section] ?? 'from-slate-400 to-slate-500'} text-white`}>{s.section}</span>
                  <span className="text-amber-400 text-sm font-black">{STARS.slice(0, s.rating)}<span className="text-slate-700">{STARS.slice(s.rating)}</span></span>
                  <span className="text-xs text-slate-600 font-mono truncate">{s.userId.slice(0, 12)}…</span>
                </div>
                {s.comment && <p className="text-sm text-slate-300 mt-1 leading-relaxed">&ldquo;{s.comment}&rdquo;</p>}
              </div>

              <span className="text-xs text-slate-600 flex-shrink-0">
                {new Date(s.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
