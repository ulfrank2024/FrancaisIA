'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProfNav from '../../../components/ProfNav';
import Spinner from '../../../components/Spinner';
import { api, LessonWithAssignments } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const SECTION_META: Record<string, { color: string; icon: string; label: string }> = {
  CO: { color: 'from-sky-400 to-cyan-500',     icon: '🎧', label: 'Compréhension Orale' },
  CE: { color: 'from-violet-400 to-purple-500', icon: '📖', label: 'Compréhension Écrite' },
  EE: { color: 'from-emerald-400 to-teal-500',  icon: '✍️', label: 'Expression Écrite' },
  EO: { color: 'from-rose-400 to-pink-500',     icon: '🎤', label: 'Expression Orale' },
};

export default function ProfLessonsPage() {
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();
  const [lessons, setLessons] = useState<LessonWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const token = await getToken().catch(() => null);
      const data = await api.lessons.listByProf(user.id, token ?? undefined);
      setLessons(data.lessons);
    };
    load().catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const filtered = filter === 'all' ? lessons : lessons.filter(l => l.section === filter);

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={40} /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <ProfNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Mes cours</h1>
            <p className="text-sm text-slate-400 mt-1">{lessons.length} cours créé(s) · assignés à vos apprenants</p>
          </div>
          <Link href="/prof/lessons/new"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold px-5 py-2.5 rounded-2xl shadow hover:shadow-md transition-all text-sm">
            + Créer un cours
          </Link>
        </motion.div>

        {/* Filtres section */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'CO', 'CE', 'EE', 'EO'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                filter === s
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}>
              {s === 'all' ? 'Tous' : `${SECTION_META[s]?.icon} ${s}`}
            </button>
          ))}
        </div>

        {/* Liste des cours */}
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-14 text-center">
            <div className="text-5xl mb-4">📚</div>
            <p className="font-bold text-slate-700 text-lg">Aucun cours pour l'instant</p>
            <p className="text-slate-400 text-sm mt-2">Crée ton premier cours et assigne-le à tes apprenants</p>
            <Link href="/prof/lessons/new"
              className="inline-block mt-5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold px-6 py-2.5 rounded-2xl text-sm">
              + Créer un cours
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((lesson, i) => {
              const meta = SECTION_META[lesson.section] ?? { color: 'from-slate-300 to-slate-400', icon: '📄', label: lesson.section };
              return (
                <motion.div key={lesson.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link href={`/prof/lessons/${lesson.id}`}
                    className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition-all group">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-white text-lg flex-shrink-0 shadow-sm`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">{lesson.title}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                        <span className={`font-bold bg-gradient-to-r ${meta.color} bg-clip-text text-transparent`}>{meta.label}</span>
                        <span>·</span>
                        <span>{lesson.assignments.length} apprenant(s) assigné(s)</span>
                        <span>·</span>
                        <span>{new Date(lesson.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <span className="text-slate-300 group-hover:text-emerald-500 transition-colors text-lg">→</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
