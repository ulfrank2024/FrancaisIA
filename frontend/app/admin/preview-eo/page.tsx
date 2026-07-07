'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Spinner from '../../../components/Spinner';
import { adminApi, BankSession } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';


const TASK_META: Record<number, { label: string; color: string; gradient: string; icon: string; prep?: string; points: string; duration: string }> = {
  1: { label: 'Présentation personnelle', icon: '👤', gradient: 'from-sky-400 to-cyan-500',     color: 'text-sky-700',    points: '3 pts',  duration: '2 min',      },
  2: { label: 'Exercice en interaction',  icon: '💬', gradient: 'from-violet-400 to-purple-500', color: 'text-violet-700', points: '7 pts',  duration: '3 min 30 s', prep: '2 min de préparation' },
  3: { label: 'Expression d\'un point de vue', icon: '🗣', gradient: 'from-rose-400 to-pink-500', color: 'text-rose-700', points: '10 pts', duration: '4 min 30 s', },
};

type SessionMap = Record<string, BankSession[]>;

function PreviewEOInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sessions, setSessions]           = useState<SessionMap>({});
  const [loading, setLoading]             = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [expandedTask, setExpandedTask]   = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user && user.role !== undefined && user.role !== 'admin') { router.push('/dashboard'); return; }
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.sessions.list({ section: 'EO' });
      const map: SessionMap = {};
      for (const s of data.sessions) {
        if (!map[s.sessionGroup]) map[s.sessionGroup] = [];
        map[s.sessionGroup].push(s);
        map[s.sessionGroup].sort((a, b) => a.taskNumber - b.taskNumber);
      }
      setSessions(map);
      const groups = Object.keys(map).sort();
      const paramGroup = searchParams.get('group');
      if (paramGroup && map[paramGroup]) setSelectedGroup(paramGroup);
      else if (groups.length > 0) setSelectedGroup(groups[0]);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin') load();
  }, [user, load]);

  const availableGroups = Object.keys(sessions).sort();
  const currentTasks    = sessions[selectedGroup] ?? [];

  if (authLoading || loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Spinner size={40} /></div>
  );

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header simulé — comme CE */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link href="/admin/dashboard" className="text-slate-400 text-sm font-medium flex items-center gap-1 hover:text-slate-600 transition-colors">
            ← Admin
          </Link>
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 text-white text-xs font-bold flex items-center gap-1.5">
            <span>🎤</span><span>EO · Expression Orale</span>
          </div>
          <div className="flex-1" />
          {selectedGroup && (
            <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-black">
              {selectedGroup}
            </div>
          )}
          <span className="hidden sm:inline text-xs font-bold text-red-400 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            Quitter l&apos;examen
          </span>
        </div>
      </div>

      {/* Bandeau admin */}
      <div className="bg-rose-600 text-white text-xs font-bold text-center py-1.5 tracking-wide select-none">
        👁 PRÉVISUALISATION ADMIN — Session telle qu&apos;elle apparaîtra aux étudiants
      </div>

      {availableGroups.length === 0 ? (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <span className="text-5xl block mb-4">🎤</span>
          <p className="font-bold text-slate-600">Aucune session EO en base</p>
          <Link href="/admin/dashboard" className="mt-4 inline-block bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
            Gérer la banque EO →
          </Link>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 flex gap-5">

          {/* Contenu principal */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Sophie */}
            <div className="flex justify-center">
              <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-slate-100">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">S</div>
                <p className="text-xs text-slate-600 font-medium">
                  Bonjour ! Je vais vous guider à travers les 3 tâches de cette épreuve d&apos;expression orale.
                </p>
              </div>
            </div>

            {/* Tâches */}
            <AnimatePresence mode="wait">
              <motion.div key={selectedGroup} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {currentTasks.map((task, i) => {
                  const meta = TASK_META[task.taskNumber];
                  const isExpanded = expandedTask === task.taskNumber;
                  const exampleItems = task.explanation ? task.explanation.split('|').filter(Boolean) : [];

                  return (
                    <motion.div key={task.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                      {/* En-tête tâche */}
                      <div className={`bg-gradient-to-r ${meta.gradient} px-5 py-3 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-black text-sm">{meta.icon} Tâche {task.taskNumber}</span>
                          <span className="text-white/80 text-xs">— {meta.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {meta.prep && (
                            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                              ⏳ {meta.prep}
                            </span>
                          )}
                          <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                            ⏱ {meta.duration}
                          </span>
                          <span className="bg-white/30 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                            {meta.points}
                          </span>
                        </div>
                      </div>

                      {/* Corps */}
                      <div className="px-5 py-4 space-y-3">

                        {/* Thème */}
                        {task.theme && (
                          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            🏷 {task.theme}
                          </div>
                        )}

                        {/* Consigne / scénario */}
                        <div className={`rounded-xl p-4 border ${
                          task.taskNumber === 1 ? 'bg-sky-50 border-sky-100' :
                          task.taskNumber === 2 ? 'bg-violet-50 border-violet-100' :
                          'bg-rose-50 border-rose-100'
                        }`}>
                          <p className={`text-xs font-black uppercase tracking-wider mb-2 ${meta.color}`}>
                            {task.taskNumber === 1 ? '📋 Consigne' : task.taskNumber === 2 ? '🎭 Scénario' : '💭 Sujet d\'argumentation'}
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed">{task.question}</p>
                        </div>

                        {/* Bouton micro simulé */}
                        <div className="flex items-center justify-between pt-1">
                          <button disabled className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm bg-gradient-to-r ${meta.gradient} opacity-60 cursor-not-allowed`}>
                            🎙 Commencer à parler
                          </button>
                          {/* Exemple réponse — admin only */}
                          {exampleItems.length > 0 && (
                            <button onClick={() => setExpandedTask(isExpanded ? null : task.taskNumber)}
                              className="text-xs text-amber-600 hover:text-amber-700 transition-colors font-bold flex items-center gap-1 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                              🔒 {isExpanded ? 'Masquer' : 'Exemple de réponse'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Exemple dépliable — admin uniquement */}
                      <AnimatePresence>
                        {isExpanded && exampleItems.length > 0 && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="border-t border-amber-100 overflow-hidden">
                            <div className="px-5 py-4 bg-amber-50">
                              <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mb-3">
                                🔒 Exemple de réponse — Admin uniquement
                              </p>
                              {task.taskNumber === 2 ? (
                                <div className="space-y-1.5">
                                  {exampleItems.map((q, j) => (
                                    <div key={j} className="flex items-start gap-2">
                                      <span className="text-amber-500 text-xs font-black mt-0.5 flex-shrink-0">{j + 1}.</span>
                                      <p className="text-sm text-slate-700">{q}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-slate-700 leading-relaxed">{task.explanation}</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {currentTasks.length < 3 && (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                    <p className="text-slate-400 text-sm">
                      {3 - currentTasks.length} tâche{3 - currentTasks.length > 1 ? 's' : ''} manquante{3 - currentTasks.length > 1 ? 's' : ''} pour compléter {selectedGroup}
                    </p>
                    <Link href="/admin/dashboard" className="text-xs text-rose-500 hover:underline mt-1 inline-block">
                      Ajouter depuis la banque EO →
                    </Link>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Panneau navigation — comme CE */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-20 space-y-4">

              <h3 className="font-black text-slate-800 text-sm">Sessions disponibles</h3>

              <div className="space-y-1.5">
                {availableGroups.map(g => (
                  <button key={g} onClick={() => { setSelectedGroup(g); setExpandedTask(null); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedGroup === g
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}>
                    <span>{g}</span>
                    <span>{sessions[g]?.length ?? 0}/3 tâches</span>
                  </button>
                ))}
                {['EO-S01','EO-S02','EO-S03','EO-S04','EO-S05','EO-S06','EO-S07','EO-S08']
                  .filter(g => !availableGroups.includes(g))
                  .map(g => (
                    <div key={g} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 text-slate-300 border border-dashed border-slate-200">
                      <span>{g}</span>
                      <span>vide</span>
                    </div>
                  ))}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Tâches complètes</span>
                  <span className="font-black text-emerald-600">{currentTasks.length}/3</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Points session</span>
                  <span className="font-black">20 pts</span>
                </div>
              </div>

              <Link href="/admin/dashboard"
                className="block w-full py-2.5 rounded-xl text-white font-black text-xs bg-rose-500 hover:bg-rose-600 transition-colors text-center">
                Gérer la banque EO
              </Link>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default function PreviewEO() {
  return <Suspense fallback={null}><PreviewEOInner /></Suspense>;
}
