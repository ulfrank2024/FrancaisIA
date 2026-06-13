'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import AdminNav from '../../../components/AdminNav';
import Spinner from '../../../components/Spinner';
import { adminApi, AdminUser } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';

function isAdmin(id: string) { return id === process.env.NEXT_PUBLIC_ADMIN_USER_ID; }

const ROLE_STYLE: Record<string, string> = {
  admin:      'bg-yellow-900 text-yellow-400',
  professeur: 'bg-emerald-900 text-emerald-400',
  apprenant:  'bg-slate-800 text-slate-400',
};
const PLAN_STYLE: Record<string, string> = {
  annual: 'bg-emerald-900 text-emerald-400',
  pro:    'bg-indigo-900 text-indigo-400',
  free:   'bg-slate-800 text-slate-500',
};

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  useEffect(() => {
    if (!authLoading && user && !isAdmin(user.id)) router.push('/dashboard');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !isAdmin(user.id)) return;
    adminApi.users().then(r => setUsers(r.users)).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Spinner size={40} /></div>;

  const filtered = users.filter(u => {
    const matchSearch = !search || u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AdminNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-black">Utilisateurs 👥</h1>
          <p className="text-slate-400 text-sm mt-0.5">{users.length} utilisateurs inscrits via Clerk</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors" />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500">
            <option value="">Tous les rôles</option>
            <option value="admin">Admin</option>
            <option value="professeur">Professeur</option>
            <option value="apprenant">Apprenant</option>
          </select>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Avatar</span><span>Utilisateur</span><span>Rôle</span><span>Plan</span><span>Inscription</span>
          </div>
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-600">Aucun utilisateur trouvé</div>
          ) : (
            filtered.map((u, i) => (
              <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto] gap-2 sm:gap-4 px-5 py-4 border-b border-slate-800/50 last:border-0 items-start sm:items-center hover:bg-slate-800/30 transition-colors">
                <img src={`https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${u.email}&backgroundColor=b6e3f4`}
                  className="w-9 h-9 rounded-full border border-slate-700" alt="" />
                <div>
                  <div className="font-semibold text-sm">{u.fullName || <span className="text-slate-600 italic">Sans nom</span>}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_STYLE[u.role] ?? ROLE_STYLE.apprenant}`}>
                  {u.role}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PLAN_STYLE[u.plan] ?? PLAN_STYLE.free}`}>
                  {u.plan}
                </span>
                <span className="text-xs text-slate-600">
                  {new Date(u.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
