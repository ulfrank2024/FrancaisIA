'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProfNav from '../../../components/ProfNav';
import Spinner from '../../../components/Spinner';
import { api, ExerciseSubmission } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const SECTION_META: Record<string, { color: string; icon: string }> = {
  EE: { color: 'from-emerald-400 to-teal-500', icon: '✍️' },
  EO: { color: 'from-rose-400 to-pink-500',    icon: '🎤' },
};

export default function CorrectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'pending' | 'corrected'>('pending');
  const [subs, setSubs] = useState<ExerciseSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.submissions.listForProf(user.id, tab)
      .then(r => setSubs(r.submissions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, tab]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={40} /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <ProfNav />
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-slate-800">File de corrections</h1>
          <p className="text-slate-500 text-sm mt-1">Soumissions EE et EO de tes apprenants</p>
        </motion.div>

        <div className="flex gap-2">
          {(['pending', 'corrected'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === t ? 'bg-emerald-600 text-white shadow' : 'bg-white text-slate-500 border border-slate-200 hover:border-emerald-300'}`}>
              {t === 'pending' ? '⏳ En attente' : '✅ Corrigées'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={32} /></div>
        ) : subs.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
            <div className="text-5xl mb-4">{tab === 'pending' ? '✏️' : '✅'}</div>
            <p className="font-bold text-slate-700">{tab === 'pending' ? 'Aucune correction en attente' : 'Aucune correction effectuée'}</p>
            <p className="text-slate-400 text-sm mt-1">{tab === 'pending' ? 'Tes apprenants n\'ont pas encore soumis d\'exercices EE/EO' : 'Les corrections apparaîtront ici'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subs.map((sub, i) => (
              <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link href={`/prof/classes/${sub.classId}/students/${sub.studentId}`}
                  className="block bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition-all group">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${SECTION_META[sub.section]?.color ?? 'from-slate-300 to-slate-400'} flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
                        {sub.section}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                          Apprenant {sub.studentId.slice(-6).toUpperCase()}
                          {sub.className && <span className="text-xs text-slate-400 font-normal">· {sub.className}</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{sub.question}</p>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(sub.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sub.status === 'corrected' && sub.score !== null && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-full">{sub.score}/20</span>
                      )}
                      <span className="text-slate-300 group-hover:text-emerald-500 transition-colors text-lg">→</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
