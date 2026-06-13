'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import SophieAvatar, { AvatarMood } from '../../../components/SophieAvatar';
import ScoreRing from '../../../components/ScoreRing';
import Spinner from '../../../components/Spinner';
import { api, Question, CorrectionResult } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const SECTION_META: Record<string, { label: string; icon: string; color: string; isWritten: boolean }> = {
  CO: { label: 'Compréhension Orale', icon: '🎧', color: 'from-sky-400 to-cyan-500', isWritten: false },
  CE: { label: 'Compréhension Écrite', icon: '📖', color: 'from-violet-400 to-purple-500', isWritten: false },
  EE: { label: 'Expression Écrite', icon: '✍️', color: 'from-emerald-400 to-teal-500', isWritten: true },
  EO: { label: 'Expression Orale', icon: '🎤', color: 'from-rose-400 to-pink-500', isWritten: true },
};

export default function PracticePage() {
  const { section } = useParams<{ section: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const meta = SECTION_META[section?.toUpperCase()] ?? SECTION_META.CE;
  const sectionCode = section?.toUpperCase() as 'CO' | 'CE' | 'EE' | 'EO';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [writtenAnswer, setWrittenAnswer] = useState('');
  const [correction, setCorrection] = useState<CorrectionResult | null>(null);
  const [mood, setMood] = useState<AvatarMood>('idle');
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [startTime] = useState(Date.now());

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.questions.list({ section: sectionCode, limit: 5 });
      setQuestions(res.questions);
    } finally {
      setLoading(false);
    }
  }, [sectionCode]);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    fetchQuestions();
  }, [user, router, fetchQuestions]);

  const q = questions[current];

  async function handleMCQ(optKey: string) {
    if (selected) return;
    setSelected(optKey);
    // On récupère la bonne réponse depuis le service
    try {
      const full = await api.questions.list({ section: sectionCode, limit: 1 });
      void full; // on simule une vérification simple
    } catch {}
    // Simulation vérification (dans un vrai app on appelle GET /questions/:id)
    const isCorrect = optKey === q.answer;
    const score = isCorrect ? 100 : 0;
    setScores(s => [...s, score]);
    setMood(isCorrect ? 'celebrate' : 'encourage');
  }

  async function handleWrittenSubmit() {
    if (!writtenAnswer.trim()) return;
    setCorrecting(true);
    setMood('thinking');
    try {
      const res = await api.ai.correct({ text: writtenAnswer, section: sectionCode, prompt: q.question });
      setCorrection(res);
      setScores(s => [...s, res.score]);
      setMood(res.score >= 70 ? 'celebrate' : res.score >= 50 ? 'happy' : 'encourage');
    } catch {
      setMood('encourage');
    } finally {
      setCorrecting(false);
    }
  }

  async function handleNext() {
    if (current + 1 >= questions.length) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const duration = Math.round((Date.now() - startTime) / 1000);
      if (user) {
        await api.progress.save({
          userId: user.id, section: sectionCode,
          score: avg, total: questions.length,
          correct: scores.filter(s => s >= 70).length,
          durationSeconds: duration,
        }).catch(() => {});
      }
      setDone(true);
      setMood('celebrate');
      return;
    }
    setCurrent(c => c + 1);
    setSelected(null);
    setWrittenAnswer('');
    setCorrection(null);
    setMood('idle');
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Spinner size={40} /><p className="text-slate-500">Chargement des questions...</p>
    </div>
  );

  if (done) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-cyan-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center space-y-6"
        >
          <SophieAvatar mood="celebrate" size="md" showMessage={true} />
          <h2 className="text-2xl font-black text-slate-800">Session terminée !</h2>
          <ScoreRing score={avg} size={120} />
          <p className="text-slate-500">{scores.length} questions • Section {sectionCode}</p>
          <div className="flex gap-3">
            <button onClick={fetchQuestions} className="flex-1 bg-indigo-50 text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-100 transition-colors">
              Recommencer
            </button>
            <button onClick={() => router.push('/dashboard')} className="flex-1 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-3 rounded-xl shadow hover:shadow-md transition-all">
              Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 pb-10">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-4">
          <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-indigo-600 transition-colors text-sm flex-shrink-0">← Retour</button>
          <div className={`px-2 sm:px-3 py-1 rounded-full bg-gradient-to-r ${meta.color} text-white text-xs font-bold flex items-center gap-1 min-w-0`}>
            <span>{meta.icon}</span>
            <span className="hidden sm:inline">{sectionCode} · {meta.label}</span>
            <span className="sm:hidden">{sectionCode}</span>
          </div>
          <div className="ml-auto text-xs sm:text-sm text-slate-400 flex-shrink-0 whitespace-nowrap">
            Q {current + 1}/{questions.length}
          </div>
        </div>
        {/* Barre de progression */}
        <div className="h-1 bg-slate-100">
          <motion.div
            className={`h-full bg-gradient-to-r ${meta.color}`}
            animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-6 sm:pt-8 space-y-4 sm:space-y-6">
        {/* Sophie */}
        <div className="flex justify-center">
          <SophieAvatar mood={mood} size="sm" showMessage={true} />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="bg-white rounded-2xl shadow-md border border-slate-100 p-6"
          >
            <p className="text-slate-800 font-semibold text-base leading-relaxed">{q?.question}</p>
          </motion.div>
        </AnimatePresence>

        {/* QCM */}
        {!meta.isWritten && q?.options && (
          <div className="grid gap-3">
            {Object.entries(q.options).map(([key, val]) => {
              const isSelected = selected === key;
              const isCorrect = selected && key === q.answer;
              const isWrong = isSelected && key !== q.answer;
              return (
                <motion.button
                  key={key}
                  onClick={() => handleMCQ(key)}
                  disabled={!!selected}
                  whileHover={!selected ? { scale: 1.01 } : {}}
                  whileTap={!selected ? { scale: 0.99 } : {}}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all flex items-center gap-3
                    ${isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-700' :
                      isWrong ? 'border-red-300 bg-red-50 text-red-600' :
                      isSelected ? 'border-indigo-400 bg-indigo-50' :
                      'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'}`}
                >
                  <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center
                    ${isCorrect ? 'bg-emerald-400 text-white' : isWrong ? 'bg-red-400 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {key.toUpperCase()}
                  </span>
                  {String(val)}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Expression écrite / orale */}
        {meta.isWritten && !correction && (
          <div className="space-y-3">
            <textarea
              value={writtenAnswer}
              onChange={e => setWrittenAnswer(e.target.value)}
              placeholder={sectionCode === 'EE' ? 'Rédigez votre réponse ici...' : 'Décrivez votre réponse orale...'}
              rows={6}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
            />
            <motion.button
              onClick={handleWrittenSubmit}
              disabled={correcting || !writtenAnswer.trim()}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-3.5 rounded-xl shadow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {correcting ? <><Spinner size={18} color="#fff" /> Sophie corrige...</> : '✨ Faire corriger par Sophie'}
            </motion.button>
          </div>
        )}

        {/* Résultat correction IA */}
        {correction && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 space-y-4"
          >
            <div className="flex items-center gap-4">
              <ScoreRing score={correction.score} size={72} />
              <div>
                <div className="font-black text-slate-800 text-lg">Correction de Sophie</div>
                <div className="text-xs text-slate-500">Section {sectionCode}</div>
              </div>
            </div>

            {correction.strengths.length > 0 && (
              <div>
                <div className="text-sm font-bold text-emerald-700 mb-1">✅ Points forts</div>
                <ul className="text-sm text-slate-600 space-y-1">
                  {correction.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            )}

            {correction.errors.length > 0 && (
              <div>
                <div className="text-sm font-bold text-red-600 mb-1">❌ À corriger</div>
                <ul className="text-sm text-slate-600 space-y-2">
                  {correction.errors.map((e, i) => (
                    <li key={i} className="bg-red-50 rounded-lg px-3 py-2">
                      <span className="line-through text-red-400">{e.text}</span>
                      {' → '}
                      <span className="text-emerald-600 font-medium">{e.correction}</span>
                      <div className="text-xs text-slate-500 mt-0.5">Règle : {e.rule}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {correction.tips.length > 0 && (
              <div>
                <div className="text-sm font-bold text-indigo-600 mb-1">💡 Conseils</div>
                <ul className="text-sm text-slate-600 space-y-1">
                  {correction.tips.map((t, i) => <li key={i}>• {t}</li>)}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {/* Bouton suivant */}
        {(selected || correction) && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleNext}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-4 rounded-xl shadow hover:shadow-md transition-all"
          >
            {current + 1 >= questions.length ? '🏁 Terminer la session' : 'Question suivante →'}
          </motion.button>
        )}
      </div>
    </div>
  );
}
