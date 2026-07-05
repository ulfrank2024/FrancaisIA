'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import AdminNav from '../../../components/AdminNav';
import Spinner from '../../../components/Spinner';
import { adminApi, AdminUser } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';

function isAdmin(id: string) { return id === process.env.NEXT_PUBLIC_ADMIN_USER_ID; }

const ROLE_META: Record<string, { label: string; color: string; icon: string }> = {
  admin:     { label: 'Admin',     icon: '⚡', color: 'bg-yellow-900/60 text-yellow-400 border-yellow-800' },
  professor: { label: 'Professeur', icon: '👨‍🏫', color: 'bg-emerald-900/60 text-emerald-400 border-emerald-800' },
  student:   { label: 'Étudiant',  icon: '🎓', color: 'bg-slate-800 text-slate-400 border-slate-700' },
};

const PLAN_META: Record<string, { label: string; color: string; price: string }> = {
  free:   { label: 'Gratuit', color: 'bg-slate-800 text-slate-400 border-slate-700', price: '0 $' },
  pro:    { label: 'Pro',     color: 'bg-indigo-900/60 text-indigo-400 border-indigo-800', price: '9,99 $/mois' },
  annual: { label: 'Annuel', color: 'bg-emerald-900/60 text-emerald-400 border-emerald-800', price: '79,99 $/an' },
};

type SortKey = 'recent' | 'oldest' | 'name' | 'plan';

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [sortKey, setSortKey]       = useState<SortKey>('recent');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && !isAdmin(user.id)) router.push('/dashboard');
  }, [user, authLoading, router]);

  const load = () => {
    if (!user) return;
    adminApi.users().then(r => setUsers(r.users)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { if (user && isAdmin(user.id)) load(); }, [user]);

  async function handleGrant(u: AdminUser) {
    setGrantingId(u.id);
    try {
      await adminApi.upsertSubscription({ userId: u.id, email: u.email, plan: 'pro' });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, plan: 'pro' } : x));
    } catch {} finally { setGrantingId(null); }
  }

  async function handleRevoke(u: AdminUser) {
    setRevokingId(u.id);
    try {
      await adminApi.revokeSubscription(u.id);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, plan: 'free' } : x));
    } catch {} finally { setRevokingId(null); }
  }

  if (authLoading || loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Spinner size={40} /></div>
  );

  // Stats
  const totalProfs   = users.filter(u => u.role === 'professor').length;
  const totalPaid    = users.filter(u => u.plan !== 'free').length;
  const totalStudents = users.filter(u => u.role !== 'professor' && u.role !== 'admin').length;
  const convRate     = users.length > 0 ? Math.round((totalPaid / users.length) * 100) : 0;

  // Filter + sort
  const filtered = users
    .filter(u => {
      const q = search.toLowerCase();
      const matchText = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = !filterRole || u.role === filterRole;
      const matchPlan = !filterPlan || u.plan === filterPlan;
      return matchText && matchRole && matchPlan;
    })
    .sort((a, b) => {
      if (sortKey === 'recent') return b.createdAt - a.createdAt;
      if (sortKey === 'oldest') return a.createdAt - b.createdAt;
      if (sortKey === 'name')   return (a.fullName || '').localeCompare(b.fullName || '');
      if (sortKey === 'plan')   return (b.plan === 'free' ? 0 : 1) - (a.plan === 'free' ? 0 : 1);
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <AdminNav />
      <div className="flex-1 min-w-0 px-4 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black">Utilisateurs 👥</h1>
          <p className="text-slate-400 text-sm mt-0.5">{users.length} comptes inscrits via Clerk</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: '👥', label: 'Total inscrits',     value: users.length,    color: 'from-slate-400 to-slate-500' },
            { icon: '👨‍🏫', label: 'Professeurs',       value: totalProfs,      color: 'from-emerald-400 to-teal-500' },
            { icon: '🎓', label: 'Étudiants',          value: totalStudents,   color: 'from-sky-400 to-cyan-500' },
            { icon: '💳', label: `Payants (${convRate}%)`, value: totalPaid,  color: 'from-indigo-400 to-violet-500' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className={`text-2xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.icon} {s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Filtres + tri */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Filtre rôle */}
            <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              {([['', 'Tous'], ['professor', 'Profs'], ['student', 'Étudiants']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFilterRole(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterRole === val ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {label}
                </button>
              ))}
            </div>
            {/* Filtre plan */}
            <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 outline-none focus:border-indigo-500">
              <option value="">Tous les plans</option>
              <option value="free">Gratuit</option>
              <option value="pro">Pro</option>
              <option value="annual">Annuel</option>
            </select>
            {/* Tri */}
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 outline-none focus:border-indigo-500">
              <option value="recent">Plus récents</option>
              <option value="oldest">Plus anciens</option>
              <option value="name">Nom A→Z</option>
              <option value="plan">Payants en premier</option>
            </select>
          </div>
        </div>

        {/* Résultats */}
        <div className="text-xs text-slate-600">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</div>

        {/* Liste */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/60">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-600">
              <div className="text-4xl mb-3">🔍</div>
              <p>Aucun utilisateur trouvé</p>
            </div>
          ) : filtered.map((u, i) => {
            const roleMeta = ROLE_META[u.role] ?? ROLE_META.student;
            const planMeta = PLAN_META[u.plan] ?? PLAN_META.free;
            const isPaid   = u.plan !== 'free';
            const isExp    = expandedId === u.id;

            return (
              <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.025, 0.3) }}>

                {/* Ligne principale */}
                <div
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/20 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(isExp ? null : u.id)}>

                  {/* Avatar */}
                  <img src={`https://api.dicebear.com/9.x/personas/svg?seed=${u.email}`} className="w-10 h-10 rounded-xl border border-slate-700 flex-shrink-0" alt="" />

                  {/* Identité */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {u.fullName || <span className="text-slate-600 italic font-normal">Sans nom</span>}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{u.email}</div>
                  </div>

                  {/* Badges */}
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${roleMeta.color}`}>
                      {roleMeta.icon} {roleMeta.label}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${planMeta.color}`}>
                      {planMeta.label}
                    </span>
                    <span className="text-xs text-slate-600 w-24 text-right">
                      {new Date(u.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                  </div>

                  <span className="text-slate-600 text-xs flex-shrink-0">{isExp ? '▲' : '▼'}</span>
                </div>

                {/* Détail dépliable */}
                <AnimatePresence>
                  {isExp && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-slate-800/60">
                      <div className="px-5 py-4 bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center gap-4">

                        {/* Infos détaillées */}
                        <div className="flex-1 space-y-1.5 text-xs text-slate-500">
                          <div><span className="text-slate-400 font-bold">ID Clerk :</span> <span className="font-mono text-slate-600 break-all">{u.id}</span></div>
                          <div><span className="text-slate-400 font-bold">Rôle :</span> {roleMeta.icon} {roleMeta.label}</div>
                          <div><span className="text-slate-400 font-bold">Plan :</span> {planMeta.label} — {planMeta.price}</div>
                          <div><span className="text-slate-400 font-bold">Inscrit le :</span> {new Date(u.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-shrink-0">
                          {isPaid ? (
                            <button onClick={e => { e.stopPropagation(); handleRevoke(u); }}
                              disabled={revokingId === u.id}
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-900 text-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-50">
                              {revokingId === u.id ? <Spinner size={12} /> : '✕'} Révoquer accès
                            </button>
                          ) : (
                            <button onClick={e => { e.stopPropagation(); handleGrant(u); }}
                              disabled={grantingId === u.id}
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 shadow">
                              {grantingId === u.id ? <Spinner size={12} color="#fff" /> : '✓'} Accorder Pro
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
