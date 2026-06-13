'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import AdminNav from '../../../components/AdminNav';
import Spinner from '../../../components/Spinner';
import { adminApi, AdminStats } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';

function isAdmin(userId: string) {
  return userId === process.env.NEXT_PUBLIC_ADMIN_USER_ID;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user && !isAdmin(user.id)) { router.push('/dashboard'); return; }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !isAdmin(user.id)) return;
    adminApi.stats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Spinner size={40} /></div>;

  const planColors: Record<string, string> = { free: 'text-slate-400', pro: 'text-indigo-400', annual: 'text-emerald-400' };
  const subTotal = stats ? Object.values(stats.subscriptions).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-black">Vue globale ⚡</h1>
          <p className="text-slate-400 mt-1 text-sm">Tableau de bord administrateur — FrançaisIA</p>
        </motion.div>

        {/* Métriques principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Utilisateurs',         value: stats?.totalUsers ?? 0,        icon: '👥', color: 'from-indigo-500 to-violet-500', href: '/admin/users' },
            { label: 'Sessions TCF',          value: stats?.totalSessions ?? 0,     icon: '📊', color: 'from-sky-500 to-cyan-500', href: null },
            { label: 'Professeurs actifs',    value: stats?.approvedProfessors ?? 0,icon: '👨‍🏫', color: 'from-emerald-500 to-teal-500', href: '/admin/professors' },
            { label: 'Classes actives',       value: stats?.totalClasses ?? 0,      icon: '🏫', color: 'from-amber-500 to-orange-500', href: null },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              {s.href ? (
                <Link href={s.href} className="block bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-600 transition-colors group">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-lg mb-3`}>{s.icon}</div>
                  <div className="text-3xl font-black">{s.value.toLocaleString('fr-CA')}</div>
                  <div className="text-xs text-slate-500 mt-0.5 group-hover:text-slate-400 transition-colors">{s.label} →</div>
                </Link>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-lg mb-3`}>{s.icon}</div>
                  <div className="text-3xl font-black">{s.value.toLocaleString('fr-CA')}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Abonnements */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-lg">Abonnements 💳</h2>
              <Link href="/admin/subscriptions" className="text-xs text-indigo-400 hover:underline">Gérer →</Link>
            </div>
            {stats && (
              <div className="space-y-3">
                {[['free', 'Gratuit', '0 $'], ['pro', 'Pro', '9,99 $/mois'], ['annual', 'Annuel', '79,99 $/an']].map(([plan, label, price]) => {
                  const count = stats.subscriptions[plan] ?? 0;
                  const pct = subTotal > 0 ? (count / subTotal) * 100 : 0;
                  return (
                    <div key={plan}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className={`font-semibold ${planColors[plan]}`}>{label} <span className="text-slate-600 font-normal text-xs">({price})</span></span>
                        <span className="font-black">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-2 rounded-full bg-gradient-to-r ${plan === 'free' ? 'from-slate-500 to-slate-400' : plan === 'pro' ? 'from-indigo-500 to-violet-500' : 'from-emerald-500 to-teal-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-slate-800 flex justify-between text-xs text-slate-500">
                  <span>Total inscrits</span><span className="font-black text-white">{subTotal}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Demandes prof en attente */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg">Demandes prof</h2>
                {(stats?.pendingProfRequests ?? 0) > 0 && (
                  <span className="text-xs bg-orange-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {stats!.pendingProfRequests} en attente
                  </span>
                )}
              </div>
              <Link href="/admin/professors" className="text-xs text-indigo-400 hover:underline">Gérer →</Link>
            </div>
            {(stats?.pendingProfRequests ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-600">
                <span className="text-4xl mb-2">✅</span>
                <p className="text-sm">Aucune demande en attente</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-slate-400 text-sm">
                  {stats!.pendingProfRequests} professeur(s) attendent ta validation.
                </p>
                <Link href="/admin/professors?tab=pending"
                  className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
                  🔔 Voir les demandes en attente
                </Link>
              </div>
            )}
          </motion.div>
        </div>

        {/* Actions rapides */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-black text-lg mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/admin/professors?action=invite', label: 'Inviter un prof', icon: '📧', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
              { href: '/admin/users', label: 'Voir les users', icon: '👥', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
              { href: '/admin/subscriptions?action=add', label: 'Gérer abonnement', icon: '💳', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
              { href: '/admin/professors', label: 'Valider profs', icon: '✅', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className={`flex flex-col items-center gap-2 border rounded-xl p-4 text-center text-xs font-semibold hover:brightness-110 transition-all ${a.color}`}>
                <span className="text-2xl">{a.icon}</span>{a.label}
              </Link>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
