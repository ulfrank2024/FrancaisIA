'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import SophieAvatar, { AvatarMood } from '../../../components/SophieAvatar';
import ScoreRing from '../../../components/ScoreRing';
import Spinner from '../../../components/Spinner';
import { api, Question, EpreuvSession, CorrectionResult, ClassData } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const SECTION_META: Record<string, { label: string; icon: string; color: string; isWritten: boolean; isOral: boolean }> = {
  CO: { label: 'Compréhension Orale', icon: '🎧', color: 'from-sky-400 to-cyan-500', isWritten: false, isOral: false },
  CE: { label: 'Compréhension Écrite', icon: '📖', color: 'from-violet-400 to-purple-500', isWritten: false, isOral: false },
  EE: { label: 'Expression Écrite', icon: '✍️', color: 'from-emerald-400 to-teal-500', isWritten: true, isOral: false },
  EO: { label: 'Expression Orale', icon: '🎤', color: 'from-rose-400 to-pink-500', isWritten: true, isOral: true },
};

// ── Lecteur audio TTS (Web Speech API — gratuit, intégré au navigateur) ──
function AudioPlayer({ transcript }: { transcript: string }) {
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  function play() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(transcript);
    utter.lang = 'fr-CA';
    // Chercher une voix française canadienne, sinon française
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === 'fr-CA') || voices.find(v => v.lang.startsWith('fr'));
    if (voice) utter.voice = voice;
    utter.rate = 0.9;
    utter.pitch = 1.0;
    utter.onstart = () => setPlaying(true);
    utter.onend = () => { setPlaying(false); setPlayed(true); };
    utter.onerror = () => setPlaying(false);
    utterRef.current = utter;
    window.speechSynthesis.speak(utter);
  }

  function stop() {
    window.speechSynthesis.cancel();
    setPlaying(false);
  }

  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  return (
    <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-center gap-4">
      <button onClick={playing ? stop : play}
        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow transition-all flex-shrink-0
          ${playing ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-sky-500 hover:bg-sky-600'}`}>
        {playing ? '⏹' : '▶'}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-sky-700 mb-0.5">
          {playing ? 'En cours de lecture...' : played ? 'Audio lu — Vous pouvez écouter à nouveau' : 'Appuyez ▶ pour écouter l\'audio'}
        </div>
        <div className="h-1.5 bg-sky-100 rounded-full overflow-hidden">
          <motion.div className="h-full bg-sky-400 rounded-full"
            animate={{ width: playing ? '100%' : played ? '100%' : '0%' }}
            transition={{ duration: playing ? 8 : 0.3 }} />
        </div>
      </div>
      <div className="text-xs text-sky-500 flex-shrink-0">
        {played && !playing ? '✓ Lu' : '🎧 TCF'}
      </div>
    </div>
  );
}

// ── Compteur de mots ──
function WordCount({ text, min, max }: { text: string; min?: number; max?: number }) {
  const count = text.trim() ? text.trim().split(/\s+/).length : 0;
  const ok = (!min || count >= min) && (!max || count <= max);
  const over = max && count > max;
  return (
    <div className={`text-xs font-semibold ${over ? 'text-red-500' : ok && count > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
      {count} mot{count !== 1 ? 's' : ''}
      {min && max ? ` · Objectif : ${min}–${max}` : min ? ` · Minimum : ${min}` : ''}
    </div>
  );
}

export default function PracticePage() {
  const { section } = useParams<{ section: string }>();
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();
  const sectionCode = section?.toUpperCase() as 'CO' | 'CE' | 'EE' | 'EO';
  const meta = SECTION_META[sectionCode] ?? SECTION_META.CE;

  // État commun
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [mood, setMood] = useState<AvatarMood>('idle');
  const [scores, setScores] = useState<number[]>([]);
  const [startTime] = useState(Date.now());

  // CO/CE : questions individuelles
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  // EE/EO : sessions de 3 tâches
  const [session, setSession] = useState<EpreuvSession | null>(null);
  const [currentTask, setCurrentTask] = useState(0);
  const [taskAnswers, setTaskAnswers] = useState<string[]>(['', '', '']);
  const [taskCorrections, setTaskCorrections] = useState<(CorrectionResult | null)[]>([null, null, null]);
  const [taskSubmitted, setTaskSubmitted] = useState<boolean[]>([false, false, false]);
  const [correcting, setCorrecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Soumission prof
  const [studentClasses, setStudentClasses] = useState<ClassData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) { setError('Session expirée — reconnecte-toi.'); setLoading(false); return; }
      if (meta.isWritten) {
        const res = await api.questions.session({ section: sectionCode as 'EE' | 'EO' }, token);
        setSession(res.session);
        setTaskAnswers(['', '', '']);
        setTaskCorrections([null, null, null]);
        setTaskSubmitted([false, false, false]);
        setCurrentTask(0);
      } else {
        const res = await api.questions.list({ section: sectionCode, limit: 8 }, token);
        if (res.questions.length === 0) {
          setError('Aucune question disponible pour cette section. Réessayez dans quelques secondes.');
        }
        setQuestions(res.questions);
        setCurrent(0);
        setSelected(null);
      }
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
      if (msg.includes('429') || msg.includes('trop')) {
        setError('Trop de requêtes — attends quelques secondes et clique Réessayer.');
      } else if (msg.includes('token') || msg.includes('401') || msg.includes('unauthorized')) {
        setError('Session expirée — reconnecte-toi.');
      } else {
        setError(`Erreur de chargement — vérifie ta connexion et réessaie.`);
      }
    } finally {
      setLoading(false);
    }
  // getToken est stable (Clerk), pas besoin dans les deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionCode, meta.isWritten]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchContent();
    if (meta.isWritten) {
      getToken().then(token => {
        if (!token) return;
        api.classes.listByStudent(user.id, token)
          .then(r => {
            setStudentClasses(r.classes);
            if (r.classes.length === 1) setSelectedClassId(r.classes[0].id);
          })
          .catch(() => {});
      });
    }
  // getToken est stable (Clerk), pas besoin dans les deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, router, fetchContent, meta.isWritten]);

  // ── Sauvegarde et fin de session ──
  async function finishSession(finalScores: number[]) {
    const avg = finalScores.length ? Math.round(finalScores.reduce((a, b) => a + b, 0) / finalScores.length) : 0;
    const duration = Math.round((Date.now() - startTime) / 1000);
    if (user) {
      await api.progress.save({
        userId: user.id, section: sectionCode,
        score: avg, total: finalScores.length,
        correct: finalScores.filter(s => s >= 70).length,
        durationSeconds: duration,
      }).catch(() => {});
    }
    setScores(finalScores);
    setDone(true);
    setMood('celebrate');
  }

  // ── CO/CE : QCM ──
  const q = questions[current];

  function handleMCQ(optKey: string) {
    if (selected) return;
    setSelected(optKey);
    const isCorrect = optKey === q.answer;
    setMood(isCorrect ? 'celebrate' : 'encourage');
  }

  async function handleMCQNext() {
    const isCorrect = selected === q.answer;
    const newScores = [...scores, isCorrect ? 100 : 0];
    if (current + 1 >= questions.length) {
      await finishSession(newScores);
      return;
    }
    setScores(newScores);
    setCurrent(c => c + 1);
    setSelected(null);
    setMood('idle');
  }

  // ── EE/EO : gestion des tâches ──
  const task = session?.tasks[currentTask];

  function updateAnswer(val: string) {
    setTaskAnswers(prev => { const n = [...prev]; n[currentTask] = val; return n; });
  }

  async function handleCorrectWithSophie() {
    if (!task || !taskAnswers[currentTask].trim()) return;
    setCorrecting(true);
    setMood('thinking');
    try {
      const token = await getToken();
      const res = await api.ai.correct({
        text: taskAnswers[currentTask],
        section: sectionCode,
        prompt: task.question,
      }, token ?? undefined);
      setTaskCorrections(prev => { const n = [...prev]; n[currentTask] = res; return n; });
      setMood(res.score >= 70 ? 'celebrate' : res.score >= 50 ? 'happy' : 'encourage');
    } catch {
      setMood('encourage');
    } finally {
      setCorrecting(false);
    }
  }

  async function handleSubmitToProf() {
    if (!task || !taskAnswers[currentTask].trim() || !user) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await api.submissions.submit({
        studentId: user.id,
        classId: selectedClassId || undefined,
        section: sectionCode as 'EE' | 'EO',
        question: task.question,
        answer: taskAnswers[currentTask],
      }, token ?? undefined);
      setTaskSubmitted(prev => { const n = [...prev]; n[currentTask] = true; return n; });
      setMood('happy');
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTaskNext() {
    const correction = taskCorrections[currentTask];
    const taskScore = taskSubmitted[currentTask] ? 50 : correction ? correction.score : 0;
    const newScores = [...scores, taskScore];

    if (currentTask + 1 >= (session?.tasks.length ?? 0)) {
      await finishSession(newScores);
      return;
    }
    setScores(newScores);
    setCurrentTask(t => t + 1);
    setMood('idle');
  }

  const canAdvanceTask = taskCorrections[currentTask] !== null || taskSubmitted[currentTask];

  // ── États de chargement et de fin ──
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Spinner size={40} /><p className="text-slate-500">Chargement de l'épreuve...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-4">
      <div className="text-5xl">⚠️</div>
      <p className="text-slate-600 font-semibold text-center max-w-sm">{error}</p>
      <button onClick={fetchContent}
        className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">
        Réessayer
      </button>
      <button onClick={() => router.push('/dashboard')} className="text-slate-400 text-sm hover:underline">
        Retour au dashboard
      </button>
    </div>
  );

  if (done) {
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const taskCount = meta.isWritten ? (session?.tasks.length ?? 0) : questions.length;
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-cyan-50 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center space-y-6">
          <SophieAvatar mood="celebrate" size="md" showMessage={true} />
          <h2 className="text-2xl font-black text-slate-800">Session terminée !</h2>
          <ScoreRing score={avg} size={120} />
          <p className="text-slate-500">{taskCount} {meta.isWritten ? 'tâche' + (taskCount > 1 ? 's' : '') : 'question' + (taskCount > 1 ? 's' : '')} · Section {sectionCode}</p>
          <div className="flex gap-3">
            <button onClick={() => {
              setDone(false); setScores([]); setMood('idle');
              fetchContent();
            }}
              className="flex-1 bg-indigo-50 text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-100 transition-colors">
              Nouvelle session
            </button>
            <button onClick={() => router.push('/dashboard')}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-3 rounded-xl shadow hover:shadow-md transition-all">
              Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Barre de progression ──
  const totalSteps = meta.isWritten ? (session?.tasks.length ?? 3) : questions.length;
  const currentStep = meta.isWritten ? currentTask : current;
  const progressPct = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 pb-10">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-4">
          <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-indigo-600 transition-colors text-sm flex-shrink-0">← Retour</button>
          <div className={`px-2 sm:px-3 py-1 rounded-full bg-gradient-to-r ${meta.color} text-white text-xs font-bold flex items-center gap-1`}>
            <span>{meta.icon}</span>
            <span className="hidden sm:inline">{sectionCode} · {meta.label}</span>
            <span className="sm:hidden">{sectionCode}</span>
          </div>
          {meta.isWritten && session && (
            <div className="text-xs text-slate-500 hidden sm:block">
              Thème : <span className="font-semibold text-slate-700 capitalize">{session.theme}</span>
            </div>
          )}
          <div className="ml-auto text-xs sm:text-sm text-slate-400 flex-shrink-0">
            {meta.isWritten ? `Tâche ${currentTask + 1}/${totalSteps}` : `Q ${current + 1}/${totalSteps}`}
          </div>
        </div>
        {/* Barre de progression par étapes */}
        {meta.isWritten ? (
          <div className="flex px-3 sm:px-6 pb-2 gap-1.5 max-w-3xl mx-auto">
            {session?.tasks.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-500
                ${i < currentTask ? 'bg-emerald-400' : i === currentTask ? `bg-gradient-to-r ${meta.color}` : 'bg-slate-200'}`} />
            ))}
          </div>
        ) : (
          <div className="h-1 bg-slate-100">
            <motion.div className={`h-full bg-gradient-to-r ${meta.color}`}
              animate={{ width: `${progressPct}%` }} transition={{ duration: 0.4 }} />
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-6 sm:pt-8 space-y-4 sm:space-y-6">
        <div className="flex justify-center">
          <SophieAvatar mood={mood} size="sm" showMessage={true} />
        </div>

        {/* ─── CO/CE : Question MCQ ─── */}
        {!meta.isWritten && q && (
          <>
            {/* Audio TTS pour CO */}
            {sectionCode === 'CO' && q.transcript && (
              <AudioPlayer transcript={q.transcript} />
            )}

            <AnimatePresence mode="wait">
              <motion.div key={current} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="bg-white rounded-2xl shadow-md border border-slate-100 p-6">
                {q.theme && (
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                    {sectionCode === 'CO' ? '🎧 Audio — ' : '📄 '}{q.theme}
                  </div>
                )}
                <p className="text-slate-800 font-semibold text-base leading-relaxed">{q.question}</p>
              </motion.div>
            </AnimatePresence>

            <div className="grid gap-3">
              {Object.entries(q.options ?? {}).map(([key, val]) => {
                const isSelected = selected === key;
                const isCorrect = selected && key === q.answer;
                const isWrong = isSelected && key !== q.answer;
                return (
                  <motion.button key={key} onClick={() => handleMCQ(key)} disabled={!!selected}
                    whileHover={!selected ? { scale: 1.01 } : {}} whileTap={!selected ? { scale: 0.99 } : {}}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all flex items-center gap-3
                      ${isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-700' :
                        isWrong ? 'border-red-300 bg-red-50 text-red-600' :
                        isSelected ? 'border-indigo-400 bg-indigo-50' :
                        'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'}`}>
                    <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0
                      ${isCorrect ? 'bg-emerald-400 text-white' : isWrong ? 'bg-red-400 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {key.toUpperCase()}
                    </span>
                    {String(val)}
                  </motion.button>
                );
              })}
            </div>

            {selected && q.explanation && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl p-4 text-sm ${selected === q.answer ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                <span className="font-bold">Explication : </span>{q.explanation}
              </motion.div>
            )}

            {selected && (
              <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={handleMCQNext} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-4 rounded-xl shadow hover:shadow-md transition-all">
                {current + 1 >= questions.length ? '🏁 Terminer la session' : 'Question suivante →'}
              </motion.button>
            )}
          </>
        )}

        {/* ─── EE/EO : Session de 3 tâches ─── */}
        {meta.isWritten && task && (
          <>
            {/* Badge de tâche */}
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r ${meta.color} text-white`}>
                Tâche {task.taskNumber}/3
              </div>
              {task.wordCountMin && task.wordCountMax && (
                <div className="text-xs text-slate-500">{task.wordCountMin}–{task.wordCountMax} mots</div>
              )}
              {task.timeLimitMin && (
                <div className="text-xs text-slate-400">⏱ ~{task.timeLimitMin} min</div>
              )}
            </div>

            {/* Image pour EO */}
            {sectionCode === 'EO' && task.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <img src={task.imageUrl} alt="Document à analyser" className="w-full h-48 object-cover" />
              </div>
            )}

            {/* Énoncé */}
            <AnimatePresence mode="wait">
              <motion.div key={`${session?.group}-task-${currentTask}`}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="bg-white rounded-2xl shadow-md border border-slate-100 p-6">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
                  {sectionCode === 'EO' ? '🎤 Expression Orale' : '✍️ Expression Écrite'}
                  {task.theme ? ` · ${task.theme}` : ''}
                </div>
                <p className="text-slate-800 font-medium text-sm leading-relaxed whitespace-pre-line">{task.question}</p>
              </motion.div>
            </AnimatePresence>

            {/* Zone de réponse */}
            {!taskCorrections[currentTask] && !taskSubmitted[currentTask] && (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    value={taskAnswers[currentTask]}
                    onChange={e => updateAnswer(e.target.value)}
                    placeholder={sectionCode === 'EE'
                      ? 'Rédigez votre texte ici...'
                      : 'Décrivez votre réponse orale ici (les grandes idées que vous développeriez à l\'oral)...'}
                    rows={sectionCode === 'EE' ? 8 : 6}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                  />
                  {task.wordCountMin && (
                    <div className="absolute bottom-3 right-3">
                      <WordCount
                        text={taskAnswers[currentTask]}
                        min={task.wordCountMin}
                        max={task.wordCountMax ?? undefined}
                      />
                    </div>
                  )}
                </div>

                {/* Sélecteur de classe */}
                {studentClasses.length > 1 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 text-xs flex-shrink-0">Classe :</span>
                    <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-400">
                      <option value="">— Solo —</option>
                      {studentClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                <div className={`grid gap-2 ${studentClasses.length > 0 ? 'grid-cols-1 sm:grid-cols-2' : ''}`}>
                  <motion.button onClick={handleCorrectWithSophie}
                    disabled={correcting || !taskAnswers[currentTask].trim()}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-3.5 rounded-xl shadow disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                    {correcting ? <><Spinner size={18} color="#fff" /> Correction en cours...</> : '✨ Corriger avec Sophie (IA)'}
                  </motion.button>

                  {studentClasses.length > 0 && (
                    <motion.button onClick={handleSubmitToProf}
                      disabled={submitting || !taskAnswers[currentTask].trim() || (studentClasses.length > 1 && !selectedClassId)}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold py-3.5 rounded-xl shadow disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                      {submitting ? <><Spinner size={18} color="#fff" /> Envoi...</> : '👨‍🏫 Soumettre au professeur'}
                    </motion.button>
                  )}
                </div>

                {studentClasses.length > 0 && (
                  <p className="text-xs text-slate-400 text-center">
                    Sophie corrige instantanément · Le prof corrige avec son expertise
                  </p>
                )}
              </div>
            )}

            {/* Soumis au prof */}
            {taskSubmitted[currentTask] && !taskCorrections[currentTask] && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                <div className="text-4xl">📨</div>
                <h3 className="font-black text-emerald-800">Tâche {task.taskNumber} soumise !</h3>
                <p className="text-sm text-emerald-700">Ton professeur recevra ta réponse pour cette tâche.</p>
                <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  En attente de correction
                </div>
              </motion.div>
            )}

            {/* Correction IA */}
            {taskCorrections[currentTask] && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <ScoreRing score={taskCorrections[currentTask]!.score} size={72} />
                  <div>
                    <div className="font-black text-slate-800 text-lg">Correction — Tâche {task.taskNumber}</div>
                    <div className="text-xs text-slate-500">Sophie IA · Section {sectionCode}</div>
                  </div>
                </div>

                {taskCorrections[currentTask]!.strengths.length > 0 && (
                  <div>
                    <div className="text-sm font-bold text-emerald-700 mb-1">✅ Points forts</div>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {taskCorrections[currentTask]!.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                )}

                {taskCorrections[currentTask]!.errors.length > 0 && (
                  <div>
                    <div className="text-sm font-bold text-red-600 mb-1">❌ À corriger</div>
                    <ul className="text-sm text-slate-600 space-y-2">
                      {taskCorrections[currentTask]!.errors.map((e, i) => (
                        <li key={i} className="bg-red-50 rounded-lg px-3 py-2">
                          <span className="line-through text-red-400">{e.text}</span>{' → '}
                          <span className="text-emerald-600 font-medium">{e.correction}</span>
                          <div className="text-xs text-slate-500 mt-0.5">Règle : {e.rule}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {taskCorrections[currentTask]!.tips.length > 0 && (
                  <div>
                    <div className="text-sm font-bold text-indigo-600 mb-1">💡 Conseils</div>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {taskCorrections[currentTask]!.tips.map((t, i) => <li key={i}>• {t}</li>)}
                    </ul>
                  </div>
                )}

                {/* Soumettre aussi au prof */}
                {studentClasses.length > 0 && !taskSubmitted[currentTask] && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500 mb-2">Veux-tu aussi l'avis de ton professeur ?</p>
                    {studentClasses.length > 1 && (
                      <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-400 mb-2">
                        <option value="">— Choisir une classe —</option>
                        {studentClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                    <button onClick={handleSubmitToProf}
                      disabled={submitting || (studentClasses.length > 1 && !selectedClassId)}
                      className="w-full text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? <><Spinner size={16} /> Envoi...</> : '👨‍🏫 Soumettre au professeur'}
                    </button>
                  </div>
                )}

                {taskSubmitted[currentTask] && (
                  <div className="border-t border-slate-100 pt-3 flex items-center gap-2 text-xs text-emerald-600 font-semibold">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Soumis au professeur · En attente de correction
                  </div>
                )}
              </motion.div>
            )}

            {/* Bouton tâche suivante */}
            {canAdvanceTask && (
              <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={handleTaskNext} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-4 rounded-xl shadow hover:shadow-md transition-all">
                {currentTask + 1 >= (session?.tasks.length ?? 0) ? '🏁 Terminer la session' : `Tâche ${currentTask + 2} →`}
              </motion.button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
