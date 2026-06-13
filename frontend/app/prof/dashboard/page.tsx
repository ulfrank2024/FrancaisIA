'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProfNav from '../../../components/ProfNav';
import Spinner from '../../../components/Spinner';
import { api, ClassSummary } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

export default function ProfDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.classes.listByProf(user.id),
      api.submissions.listForProf(user.id, 'pending'),
    ]).then(([cls, subs]) => {
      setClasses(cls.classes);
      setPendingCount(subs.submissions.length);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center"><Spinner size={40} /></div>;

  const totalStudents = classes.reduce((n, c) => n + c.members.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <ProfNav />
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 shadow-md border border-slate-100">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Bonjour, {user.full_name.split(' ')[0]} 👋</h1>
            <p className="text-slate-500 text-sm mt-1">Tableau de bord professeur — TCF Canada</p>
          </div>
          <Link href="/prof/classes/new"
            className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold px-5 py-2.5 rounded-xl shadow hover:shadow-md transition-all text-sm flex-shrink-0">
            + Nouvelle classe
          </Link>
        </motion.div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Classes actives', value: classes.length, icon: '🏫', color: 'from-emerald-400 to-teal-500' },
            { label: 'Apprenants total', value: totalStudents, icon: '👥', color: 'from-indigo-400 to-violet-500' },
            { label: 'Corrections en attente', value: pendingCount, icon: '✏️', color: pendingCount > 0 ? 'from-orange-400 to-amber-500' : 'from-slate-300 to-slate-400', link: '/prof/corrections' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              {s.link ? (
                <Link href={s.link} className="block bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-lg mb-3`}>{s.icon}</div>
                  <div className="text-2xl font-black text-slate-800">{s.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                  {s.value > 0 && <div className="text-xs text-orange-500 font-semibold mt-1">À corriger →</div>}
                </Link>
              ) : (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-lg mb-3`}>{s.icon}</div>
                  <div className="text-2xl font-black text-slate-800">{s.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Liste des classes */}
        <div>
          <h2 className="text-xl font-black text-slate-800 mb-4">Mes classes</h2>
          {loading ? (
            <div className="flex justify-center py-12"><Spinner size={32} /></div>
          ) : classes.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
              <div className="text-5xl mb-4">🏫</div>
              <p className="font-bold text-slate-700">Aucune classe pour l'instant</p>
              <p className="text-slate-400 text-sm mt-1 mb-6">Crée ta première classe et invite tes apprenants</p>
              <Link href="/prof/classes/new"
                className="inline-block bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold px-6 py-3 rounded-xl shadow hover:shadow-md transition-all">
                Créer ma première classe →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {classes.map((cls, i) => (
                <motion.div key={cls.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Link href={`/prof/classes/${cls.id}`}
                    className="block bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-lg shadow">🏫</div>
                      <div className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full font-mono tracking-widest">
                        {cls.inviteCode}
                      </div>
                    </div>
                    <div className="font-black text-slate-800 group-hover:text-emerald-700 transition-colors">{cls.name}</div>
                    {cls.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{cls.description}</p>}
                    <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                      <span>👥 {cls.members.length} apprenant(s)</span>
                      <span>📝 {cls._count.submissions} soumission(s)</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
