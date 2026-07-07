'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Spinner from '../../../components/Spinner';
import { adminApi, BankSession } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';


// Marqueurs d'opposition français — détection automatique même sans \n\n
const OPPOSITION_RE = /\.\s+(Cependant[,\s]|Toutefois[,\s]|Néanmoins[,\s]|En revanche[,\s]|Pourtant[,\s]|Or[,\s]|Mais |À l['']opposé|D['']un autre côté|D['']une autre perspective|En opposition|Par contre[,\s])/;

function parseT3(text: string): { sujet: string; docs: string[] } {
  const t = text.trim();

  // Strategy 1 : marqueurs explicites « Document 1 / Document 2 »
  const d1M = /Document\s+1\s*(?:\([^)]*\))?\s*:/i.exec(t);
  const d2M = /Document\s+2\s*(?:\([^)]*\))?\s*:/i.exec(t);

  if (d1M && d2M) {
    const beforeD1 = t.slice(0, d1M.index).trim();
    const doc1Raw  = t.slice(d1M.index, d2M.index).trim();
    const afterD2  = t.slice(d2M.index);

    const lastGuill = afterD2.lastIndexOf('»');
    let doc2Raw: string;
    let consigne: string;
    if (lastGuill !== -1 && lastGuill < afterD2.length - 2) {
      doc2Raw  = afterD2.slice(0, lastGuill + 1).trim();
      consigne = afterD2.slice(lastGuill + 1).trim();
    } else {
      const splitM = /\n+(Résumez|Rédigez|Donnez|Exprimez|Analysez|En vous|À partir|Vous devez)/i.exec(afterD2);
      doc2Raw  = splitM ? afterD2.slice(0, splitM.index).trim() : afterD2.trim();
      consigne = splitM ? afterD2.slice(splitM.index).trim() : '';
    }

    const strip = (s: string) => s.replace(/^Document\s+\d+\s*(?:\([^)]*\))?\s*:\s*/i, '').trim();
    return { sujet: beforeD1 || consigne, docs: [strip(doc1Raw), strip(doc2Raw)] };
  }

  // Strategy 2 : ? + \n\n
  const qIdx = t.indexOf('?');
  const sujet = qIdx !== -1 ? t.slice(0, qIdx + 1).trim() : '';
  const body  = qIdx !== -1 ? t.slice(qIdx + 1).trim() : t;
  const parts = body.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { sujet, docs: parts.slice(0, 2) };

  // Strategy 3 : connecteur rhétorique
  const m = body.match(OPPOSITION_RE);
  if (m && m.index !== undefined) {
    return { sujet, docs: [body.slice(0, m.index + 1).trim(), body.slice(m.index + 1).trim()] };
  }

  return { sujet, docs: [] };
}

const TASK_META: Record<number, {
  label: string; icon: string; gradient: string; color: string;
  duration: string; wordMin: number; wordMax: number; points: string;
}> = {
  1: { label: 'Message court',         icon: '✉️', gradient: 'from-emerald-400 to-teal-500',   color: 'text-emerald-700', duration: '10 min', wordMin: 60,  wordMax: 120, points: '6 pts'  },
  2: { label: 'Narration',             icon: '📖', gradient: 'from-sky-400 to-cyan-500',       color: 'text-sky-700',     duration: '20 min', wordMin: 120, wordMax: 150, points: '7 pts'  },
  3: { label: 'Texte argumentatif',    icon: '💬', gradient: 'from-violet-400 to-purple-500', color: 'text-violet-700', duration: '30 min', wordMin: 120, wordMax: 180, points: '10 pts' },
};

type SessionMap = Record<string, BankSession[]>;

function PreviewEEInner() {
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

  const t1Id = searchParams.get('t1');
  const t2Id = searchParams.get('t2');
  const t3Id = searchParams.get('t3');
  const isCustomCombo = !!(t1Id && t2Id && t3Id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.sessions.list({ section: 'EE' });

      if (isCustomCombo) {
        // Mode combinaison formation : afficher les 3 tâches spécifiques
        const byId = Object.fromEntries(data.sessions.map(s => [s.id, s]));
        const t1 = byId[t1Id!];
        const t2 = byId[t2Id!];
        const t3 = byId[t3Id!];
        if (t1 && t2 && t3) {
          const fakeGroup = `combo-${t1.taskNumber}${t2.taskNumber}${t3.taskNumber}`;
          setSessions({ [fakeGroup]: [t1, t2, t3] });
          setSelectedGroup(fakeGroup);
        }
      } else {
        // Mode normal : grouper par sessionGroup
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
      }
    } catch {}
    finally { setLoading(false); }
  }, [searchParams, isCustomCombo, t1Id, t2Id, t3Id]);

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

      {/* Header simulé */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link href="/admin/dashboard" className="text-slate-400 text-sm font-medium flex items-center gap-1 hover:text-slate-600 transition-colors">
            ← Admin
          </Link>
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-xs font-bold flex items-center gap-1.5">
            <span>✍️</span><span>EE · Expression Écrite</span>
          </div>
          <div className="flex-1" />
          {isCustomCombo ? (
            <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5">
              🎲 Combinaison formation
            </div>
          ) : selectedGroup && (
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
      <div className="bg-emerald-600 text-white text-xs font-bold text-center py-1.5 tracking-wide select-none">
        👁 PRÉVISUALISATION ADMIN — Session telle qu&apos;elle apparaîtra aux étudiants
      </div>

      {availableGroups.length === 0 ? (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <span className="text-5xl block mb-4">✍️</span>
          <p className="font-bold text-slate-600">Aucune session EE en base</p>
          <Link href="/admin/dashboard" className="mt-4 inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
            Gérer la banque EE →
          </Link>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 flex gap-5">

          {/* Contenu principal */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Message guide */}
            <div className="flex justify-center">
              <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-slate-100">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">✍</div>
                <p className="text-xs text-slate-600 font-medium">
                  Rédigez vos réponses pour chaque tâche en respectant le nombre de mots et le temps imparti.
                </p>
              </div>
            </div>

            {/* Tâches */}
            <AnimatePresence mode="wait">
              <motion.div key={selectedGroup} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {currentTasks.map((task, i) => {
                  const meta = TASK_META[task.taskNumber];
                  const isExpanded = expandedTask === task.taskNumber;

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
                          <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                            ✏️ {meta.wordMin}–{meta.wordMax} mots
                          </span>
                          <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                            ⏱ {meta.duration}
                          </span>
                          <span className="bg-white/30 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                            {meta.points}
                          </span>
                        </div>
                      </div>

                      {/* Corps */}
                      <div className="px-5 py-4 space-y-4">

                        {/* Thème */}
                        {task.theme && (
                          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            🏷 {task.theme}
                          </div>
                        )}

                        {/* Consigne */}
                        {task.taskNumber === 3 ? (() => {
                          const { sujet, docs } = parseT3(task.question);
                          return (
                            <div className="space-y-3">
                              {sujet && (
                                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                                  <p className={`text-xs font-black uppercase tracking-wider mb-2 ${meta.color}`}>📋 Sujet</p>
                                  <p className="text-sm font-bold text-slate-800 leading-relaxed">{sujet}</p>
                                </div>
                              )}
                              {docs.length >= 2 ? (
                                <>
                                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                                    <p className="text-xs font-black text-sky-700 uppercase tracking-wider mb-2">🔵 Document 1 — Argument POUR</p>
                                    <p className="text-sm text-slate-700 leading-relaxed">{docs[0]}</p>
                                  </div>
                                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                    <p className="text-xs font-black text-orange-700 uppercase tracking-wider mb-2">🟠 Document 2 — Argument CONTRE</p>
                                    <p className="text-sm text-slate-700 leading-relaxed">{docs[1]}</p>
                                  </div>
                                </>
                              ) : (
                                <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{task.question}</p>
                                  <p className="text-xs text-amber-600 mt-2 italic">⚠ Aucun séparateur détecté — ajoutez une ligne vide entre les deux arguments</p>
                                </div>
                              )}
                            </div>
                          );
                        })() : (
                          <div className={`rounded-xl p-4 border ${
                            task.taskNumber === 1 ? 'bg-emerald-50 border-emerald-100' : 'bg-sky-50 border-sky-100'
                          }`}>
                            <p className={`text-xs font-black uppercase tracking-wider mb-2 ${meta.color}`}>📋 Consigne</p>
                            <p className="text-sm text-slate-700 leading-relaxed">{task.question}</p>
                          </div>
                        )}

                        {/* Zone de rédaction simulée */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-500 font-semibold">Zone de rédaction</p>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              0 / {meta.wordMin}–{meta.wordMax} mots
                            </span>
                          </div>
                          <div className="w-full h-36 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                            <p className="text-xs text-slate-300 font-medium italic">L&apos;étudiant rédige ici sa réponse…</p>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" />
                          </div>
                        </div>

                        {/* Critères d'évaluation — admin only */}
                        {task.explanation && (
                          <div>
                            <button onClick={() => setExpandedTask(isExpanded ? null : task.taskNumber)}
                              className="text-xs text-amber-600 hover:text-amber-700 transition-colors font-bold flex items-center gap-1 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                              🔒 {isExpanded ? 'Masquer les critères' : 'Critères d\'évaluation (admin)'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Critères dépliables — admin uniquement */}
                      <AnimatePresence>
                        {isExpanded && task.explanation && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="border-t border-amber-100 overflow-hidden">
                            <div className="px-5 py-4 bg-amber-50">
                              <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mb-3">
                                🔒 Critères d&apos;évaluation — Admin uniquement
                              </p>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{task.explanation}</p>
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
                    <Link href="/admin/dashboard" className="text-xs text-emerald-500 hover:underline mt-1 inline-block">
                      Ajouter depuis la banque EE →
                    </Link>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Panneau latéral — masqué en mode combinaison formation */}
          <div className={`${isCustomCombo ? 'hidden' : 'hidden lg:block'} w-64 flex-shrink-0`}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-20 space-y-4">

              <h3 className="font-black text-slate-800 text-sm">Sessions disponibles</h3>

              <div className="space-y-1.5">
                {availableGroups.map(g => (
                  <button key={g} onClick={() => { setSelectedGroup(g); setExpandedTask(null); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedGroup === g
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}>
                    <span>{g}</span>
                    <span>{sessions[g]?.length ?? 0}/3 tâches</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Tâches complètes</span>
                  <span className="font-black text-emerald-600">{currentTasks.length}/3</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Durée totale</span>
                  <span className="font-black">60 min</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Points session</span>
                  <span className="font-black">23 pts</span>
                </div>
              </div>

              <Link href="/admin/dashboard"
                className="block w-full py-2.5 rounded-xl text-white font-black text-xs bg-emerald-500 hover:bg-emerald-600 transition-colors text-center">
                Gérer la banque EE
              </Link>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default function PreviewEE() {
  return <Suspense fallback={null}><PreviewEEInner /></Suspense>;
}
