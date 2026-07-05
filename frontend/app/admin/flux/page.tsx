'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import AdminNav from '../../../components/AdminNav';
import Spinner from '../../../components/Spinner';
import { useAuth } from '../../../lib/auth-context';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
function isAdmin(id: string) { return id === process.env.NEXT_PUBLIC_ADMIN_USER_ID; }

async function getClerkToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try { return await (window as any).Clerk?.session?.getToken() ?? null; } catch { return null; }
}

const EVENT_LABELS: Record<string, string> = {
  page_view:        '👁 Page vue',
  session_start:    '▶ Session démarrée',
  session_complete: '✅ Session complétée',
  pricing_view:     '💰 Page tarifs',
  formation_view:   '📚 Page formation',
  register_click:   '📝 Clic inscription',
  login_success:    '🔑 Connexion',
  survey_shown:     '⭐ Sondage affiché',
  survey_submitted: '⭐ Sondage soumis',
};

const SECTION_COLOR: Record<string, string> = {
  CO: '#0ea5e9', CE: '#8b5cf6', EE: '#10b981', EO: '#f43f5e',
};

type FluxData = {
  topPages:    { page: string; _count: number }[];
  topEvents:   { event: string; _count: number }[];
  dailyEvents: { date: string; count: number }[];
  sectionUsage: { section: string; _count: number }[];
  totalEvents:  number;
  uniqueUsers:  number;
  funnel: { sessions_started: number; sessions_completed: number; completion_rate: number };
};

export default function FluxPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData]     = useState<FluxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]     = useState(30);

  useEffect(() => {
    if (!authLoading && user && !isAdmin(user.id)) router.push('/dashboard');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !isAdmin(user.id)) return;
    setLoading(true);
    (async () => {
      const token = await getClerkToken();
      const res = await fetch(`${BASE}/api/admin/flux?days=${days}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setData(await res.json());
      setLoading(false);
    })();
  }, [user, days]);

  if (authLoading || loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Spinner size={40} /></div>
  );

  const dailyForChart = (data?.dailyEvents ?? []).map((d: { date: string; count: number }) => ({
    date: new Date(d.date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' }),
    Événements: d.count,
  }));

  const sectionData = (data?.sectionUsage ?? [])
    .filter(s => s.section)
    .map(s => ({ name: s.section, sessions: s._count, fill: SECTION_COLOR[s.section] ?? '#64748b' }));

  const funnelSteps = [
    { label: 'Sessions démarrées',  value: data?.funnel.sessions_started ?? 0,   color: 'from-sky-400 to-cyan-500' },
    { label: 'Sessions complétées', value: data?.funnel.sessions_completed ?? 0, color: 'from-emerald-400 to-teal-500' },
    { label: 'Taux de complétion',  value: `${data?.funnel.completion_rate ?? 0}%`, color: 'from-violet-400 to-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <AdminNav />
      <div className="flex-1 min-w-0 px-4 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black">Flux d&apos;utilisation 📊</h1>
            <p className="text-slate-400 text-sm mt-0.5">{data?.totalEvents?.toLocaleString('fr-CA') ?? 0} événements · {data?.uniqueUsers ?? 0} utilisateurs actifs</p>
          </div>
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${days === d ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {d}j
              </button>
            ))}
          </div>
        </div>

        {/* Funnel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {funnelSteps.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className={`text-3xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Graphe journalier */}
        {dailyForChart.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-black text-slate-300 mb-4">Événements par jour</h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dailyForChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0' }} />
                <Line type="monotone" dataKey="Événements" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sections populaires */}
          {sectionData.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-black text-slate-300 mb-4">Sessions par section</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={sectionData} barSize={32}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0' }} />
                  <Bar dataKey="sessions" radius={[6, 6, 0, 0]}>
                    {sectionData.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top événements */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-black text-slate-300 mb-4">Événements fréquents</h2>
            <div className="space-y-2.5">
              {(data?.topEvents ?? []).slice(0, 8).map((e, i) => {
                const max = data?.topEvents?.[0]?._count ?? 1;
                const pct = Math.round((e._count / max) * 100);
                return (
                  <div key={e.event}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">{EVENT_LABELS[e.event] ?? e.event}</span>
                      <span className="text-slate-500 font-black">{e._count.toLocaleString('fr-CA')}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top pages */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-black text-slate-300 mb-4">Pages les plus visitées</h2>
          <div className="space-y-2">
            {(data?.topPages ?? []).map((p, i) => {
              const max = data?.topPages?.[0]?._count ?? 1;
              const pct = Math.round((p._count / max) * 100);
              return (
                <div key={p.page} className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-600 w-5 text-right flex-shrink-0">{i + 1}</span>
                  <span className="text-xs text-slate-300 font-mono truncate flex-1 min-w-0">{p.page}</span>
                  <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden flex-shrink-0">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: i * 0.03 }}
                      className="h-full rounded-full bg-indigo-500" />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right flex-shrink-0">{p._count.toLocaleString('fr-CA')}</span>
                </div>
              );
            })}
            {(data?.topPages ?? []).length === 0 && (
              <p className="text-slate-600 text-sm text-center py-6">Aucune donnée de navigation pour l&apos;instant.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
