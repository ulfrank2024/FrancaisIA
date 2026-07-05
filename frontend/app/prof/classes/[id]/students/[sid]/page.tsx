'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import ProfNav from '../../../../../../components/ProfNav';
import Spinner from '../../../../../../components/Spinner';
import ScoreRing from '../../../../../../components/ScoreRing';
import { api, ExerciseSubmission, ClassDetail, HistoryItem } from '../../../../../../lib/api';
import { useAuth } from '../../../../../../lib/auth-context';

const SECTIONS = ['CO', 'CE', 'EE', 'EO'];
const SECTION_META: Record<string, { color: string; icon: string; label: string }> = {
  CO: { color: 'from-sky-400 to-cyan-500',     icon: '🎧', label: 'Compréhension Orale' },
  CE: { color: 'from-violet-400 to-purple-500', icon: '📖', label: 'Compréhension Écrite' },
  EE: { color: 'from-emerald-400 to-teal-500',  icon: '✍️', label: 'Expression Écrite' },
  EO: { color: 'from-rose-400 to-pink-500',     icon: '🎤', label: 'Expression Orale' },
};

export default function StudentProfilePage() {
  const { id: classId, sid: studentId } = useParams<{ id: string; sid: string }>();
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [submissions, setSubmissions] = useState<ExerciseSubmission[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clsError, setClsError] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<Record<string, { score: string; feedback: string; strengths: string; errors: string }>>({});
  const [aiSuggesting, setAiSuggesting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !classId || !studentId) return;
    const load = async () => {
      const token = await getToken().catch(() => null);
      const [c, s, h] = await Promise.all([
        api.classes.get(classId, token ?? undefined),
        api.submissions.listForStudent(studentId, token ?? undefined),
        api.progress.history(studentId, token ?? undefined),
      ]);
      setCls(c);
      setSubmissions(s.submissions.filter(sub => sub.classId === classId));
      setHistory([...h.history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    };
    load().catch(() => setClsError(true)).finally(() => setLoading(false));
  }, [user, classId, studentId]);

  const student = cls?.studentStats.find(s => s.studentId === studentId);

  async function handleAiSuggest(sub: ExerciseSubmission) {
    setAiSuggesting(p => ({ ...p, [sub.id]: true }));
    setCorrecting(sub.id);
    try {
      const token = await getToken().catch(() => null);
      const res = await api.ai.correct({ text: sub.answer, section: sub.section as 'EE' | 'EO', prompt: sub.question }, token ?? undefined);
      setCorrections(p => ({
        ...p,
        [sub.id]: {
          score: String(Math.max(0, Math.min(20, Math.round(res.score / 5)))),
          feedback: [res.correctedVersion, res.tips.length ? `\n💡 Conseils :\n${res.tips.map(t => `• ${t}`).join('\n')}` : ''].join('').trim(),
          strengths: res.strengths.join('\n'),
          errors: res.errors.map(e => `${e.text} → ${e.correction} (${e.rule})`).join('\n'),
        },
      }));
    } catch {} finally { setAiSuggesting(p => ({ ...p, [sub.id]: false })); }
  }

  async function handleCorrect(subId: string) {
    const c = corrections[subId];
    if (!c?.feedback || !c?.score || !user) return;
    const scoreNum = parseInt(c.score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 20) return;

    try {
      await api.submissions.correct(subId, {
        score: scoreNum,
        feedback: c.feedback,
        strengths: c.strengths.split('\n').map(s => s.trim()).filter(Boolean),
        errors: c.errors.split('\n').map(s => s.trim()).filter(Boolean),
        correctedBy: user.id,
      });
      setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'corrected', score: scoreNum, feedback: c.feedback } : s));
      setCorrecting(null);
    } catch {}
  }

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={40} /></div>;
  if (clsError || !cls) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-400">
      <div className="text-5xl">⚠️</div>
      <p className="font-semibold">Impossible de charger les données de cet apprenant.</p>
      <button onClick={() => { setClsError(false); setLoading(true); }} className="text-sm text-indigo-500 hover:underline">Réessayer</button>
    </div>
  );
  if (!student) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-400">
      <div className="text-5xl">👤</div>
      <p className="font-semibold">Apprenant introuvable dans cette classe.</p>
      <button onClick={() => router.back()} className="text-sm text-indigo-500 hover:underline">← Retour</button>
    </div>
  );

  const radarData = SECTIONS.map(s => ({
    section: s,
    score: student.stats.find(x => x.section === s)?.averageScore ?? 0,
  }));

  const pending = submissions.filter(s => s.status === 'pending');
  const corrected = submissions.filter(s => s.status === 'corrected');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <ProfNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-8">

        {/* Header apprenant */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 flex flex-col sm:flex-row items-center gap-6">
          <img src={`https://api.dicebear.com/9.x/personas/svg?seed=${studentId}`} className="w-20 h-20 rounded-2xl border-4 border-white shadow-md" alt="avatar" />
          <div className="flex-1 text-center sm:text-left">
            <button onClick={() => router.back()} className="text-xs text-slate-400 hover:text-slate-600 mb-1 block">← Retour à la classe</button>
            <h1 className="text-xl font-black text-slate-800">Apprenant {studentId.slice(-6).toUpperCase()}</h1>
            <p className="text-slate-500 text-sm">{cls?.name} · {student.totalAttempts} exercice(s) complété(s)</p>
            {student.totalAttempts === 0 && (
              <span className="inline-block mt-2 text-xs bg-orange-50 text-orange-600 px-3 py-1 rounded-full font-semibold">⚠️ Aucun exercice encore réalisé</span>
            )}
          </div>
          {student.globalAverage !== null && <ScoreRing score={student.globalAverage} size={80} />}
        </motion.div>

        {/* Stats + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scores par section */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-6 shadow-md border border-slate-100">
            <h2 className="text-base font-black text-slate-800 mb-4">Scores par compétence</h2>
            <div className="space-y-3">
              {SECTIONS.map(s => {
                const st = student.stats.find(x => x.section === s);
                const score = st?.averageScore ?? null;
                const isWeak = score !== null && score < 60;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${SECTION_META[s].color} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>{s}</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 font-semibold">{SECTION_META[s].label}</span>
                        <span className={`font-black ${isWeak ? 'text-red-500' : score !== null ? 'text-emerald-600' : 'text-slate-300'}`}>
                          {score !== null ? `${score}/100` : 'Non pratiqué'} {isWeak ? '⚠️' : score !== null ? '✓' : ''}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-2 rounded-full bg-gradient-to-r ${SECTION_META[s].color} transition-all`}
                          style={{ width: score !== null ? `${score}%` : '0%' }} />
                      </div>
                      <div className="text-right text-xs text-slate-400 mt-0.5">{st?.attempts ?? 0} essai(s)</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Radar */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-3xl p-6 shadow-md border border-slate-100">
            <h2 className="text-base font-black text-slate-800 mb-1">Vue radar</h2>
            <p className="text-xs text-slate-400 mb-3">Visualisation des 4 compétences</p>
            {radarData.some(d => d.score > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="section" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                  <Radar dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-slate-300 gap-2">
                <span className="text-4xl">📊</span>
                <p className="text-sm">Aucun exercice complété</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Historique complet des sessions */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-800">Historique des sessions</h2>
              <p className="text-xs text-slate-400 mt-0.5">CO et CE corrigées par l&apos;IA · EE et EO soumises au prof</p>
            </div>
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{history.length} session(s)</span>
          </div>

          {history.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-400">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm">Aucune session enregistrée pour l&apos;instant</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {(showAllHistory ? history : history.slice(0, 8)).map((h, i) => {
                const meta = SECTION_META[h.section] ?? { color: 'from-slate-300 to-slate-400', icon: '❓', label: h.section };
                const pct = h.total > 0 ? Math.round((h.correct / h.total) * 100) : h.score;
                const isGood = pct >= 70;
                const date = new Date(h.createdAt);
                return (
                  <div key={h.id} className="flex items-center gap-4 px-4 sm:px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm`}>
                      {h.section}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700">{meta.label}</span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                          {pct}/100
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>📅 {date.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span>🕐 {date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>
                        {h.durationS && <span>⏱ {Math.floor(h.durationS / 60)}min{h.durationS % 60 > 0 ? ` ${h.durationS % 60}s` : ''}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-slate-500">{h.correct}/{h.total} correctes</div>
                      <div className={`w-16 h-1.5 rounded-full mt-1 bg-slate-100 overflow-hidden`}>
                        <div className={`h-1.5 rounded-full ${isGood ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {history.length > 8 && (
                <button onClick={() => setShowAllHistory(v => !v)}
                  className="w-full py-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors">
                  {showAllHistory ? '▲ Voir moins' : `▼ Voir les ${history.length - 8} sessions précédentes`}
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Soumissions EE/EO à corriger */}
        {(pending.length > 0 || corrected.length > 0) && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-black text-slate-800">Soumissions EE / EO</h2>
              {pending.length > 0 && (
                <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2.5 py-1 rounded-full">{pending.length} à corriger</span>
              )}
            </div>
            <div className="space-y-4">
              {[...pending, ...corrected].map((sub, i) => (
                <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${SECTION_META[sub.section]?.color} flex items-center justify-center text-white text-xs font-black`}>
                          {sub.section}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-700">{SECTION_META[sub.section]?.label}</div>
                          <div className="text-xs text-slate-400">{new Date(sub.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                      </div>
                      {sub.status === 'corrected' ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex-shrink-0">✓ Corrigé · {sub.score}/20</span>
                      ) : (
                        <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full flex-shrink-0">En attente</span>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 mb-3">
                      <div className="text-xs text-slate-500 font-bold mb-1">Sujet</div>
                      <p className="text-sm text-slate-700">{sub.question}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-3">
                      <div className="text-xs text-indigo-600 font-bold mb-1">Réponse de l'apprenant</div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{sub.answer}</p>
                    </div>

                    {sub.status === 'corrected' && sub.feedback && (
                      <div className="mt-3 bg-emerald-50 rounded-xl p-3">
                        <div className="text-xs text-emerald-700 font-bold mb-1">Ton retour</div>
                        <p className="text-sm text-slate-700">{sub.feedback}</p>
                        {sub.strengths.length > 0 && (
                          <div className="mt-2"><span className="text-xs font-bold text-emerald-600">✅ Points forts : </span>
                            <span className="text-xs text-slate-600">{sub.strengths.join(' · ')}</span></div>
                        )}
                        {sub.errors.length > 0 && (
                          <div className="mt-1"><span className="text-xs font-bold text-red-500">❌ À corriger : </span>
                            <span className="text-xs text-slate-600">{sub.errors.join(' · ')}</span></div>
                        )}
                      </div>
                    )}

                    {sub.status === 'pending' && (
                      <div className="mt-3">
                        {correcting === sub.id ? (
                          <div className="space-y-3">
                            {/* Bouton suggestion IA Sophie */}
                            <button onClick={() => handleAiSuggest(sub)} disabled={!!aiSuggesting[sub.id]}
                              className="w-full flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow hover:shadow-md transition-all disabled:opacity-60">
                              {aiSuggesting[sub.id]
                                ? <><span className="animate-spin">⏳</span> Sophie analyse la réponse…</>
                                : <><span>✨</span> Sophie suggère une correction</>}
                            </button>
                            {corrections[sub.id]?.feedback && (
                              <div className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 font-semibold">
                                ✓ Formulaire pré-rempli par Sophie — vérifie et ajuste avant d'envoyer.
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Score /20</label>
                                <input type="number" min={0} max={20}
                                  value={corrections[sub.id]?.score ?? ''}
                                  onChange={e => setCorrections(p => ({ ...p, [sub.id]: { ...p[sub.id], score: e.target.value } }))}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Points forts (une par ligne)</label>
                                <textarea rows={2}
                                  value={corrections[sub.id]?.strengths ?? ''}
                                  onChange={e => setCorrections(p => ({ ...p, [sub.id]: { ...p[sub.id], strengths: e.target.value } }))}
                                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald-400 resize-none" />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Commentaire global *</label>
                              <textarea rows={3}
                                value={corrections[sub.id]?.feedback ?? ''}
                                onChange={e => setCorrections(p => ({ ...p, [sub.id]: { ...p[sub.id], feedback: e.target.value } }))}
                                placeholder="Ton retour détaillé pour l'apprenant..."
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 resize-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Erreurs à corriger (une par ligne)</label>
                              <textarea rows={2}
                                value={corrections[sub.id]?.errors ?? ''}
                                onChange={e => setCorrections(p => ({ ...p, [sub.id]: { ...p[sub.id], errors: e.target.value } }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-red-300 resize-none" />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setCorrecting(null)} className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 border border-slate-200 rounded-lg">Annuler</button>
                              <button onClick={() => handleCorrect(sub.id)}
                                disabled={!corrections[sub.id]?.feedback || !corrections[sub.id]?.score}
                                className="flex-1 text-xs bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold py-1.5 rounded-lg disabled:opacity-50">
                                ✅ Envoyer la correction
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setCorrecting(sub.id)}
                            className="w-full text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-2.5 rounded-xl transition-colors">
                            ✏️ Corriger cette soumission
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
