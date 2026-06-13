'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import SophieAvatar from '../../../components/SophieAvatar';
import ScoreRing from '../../../components/ScoreRing';
import Spinner from '../../../components/Spinner';
import { api, Question } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const SECTIONS_ORDER = ['CO', 'CE', 'EE', 'EO'] as const;
const SECTION_ICONS: Record<string, string> = { CO: '🎧', CE: '📖', EE: '✍️', EO: '🎤' };

export default function MockExamPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [exam, setExam] = useState<Record<string, Question[]>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [scores] = useState<Record<string, number>>({});
  const [startTime] = useState(Date.now());

  const loadExam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.questions.mockExam();
      setExam(res.exam as Record<string, Question[]>);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadExam();
  }, [user, router, loadExam]);

  const sKey = SECTIONS_ORDER[currentSection];
  const sQuestions = exam[sKey] ?? [];
  const q = sQuestions[currentQ];
  const totalQuestions = Object.values(exam).reduce((sum, arr) => sum + arr.length, 0);
  const answeredCount = Object.keys(answers).length;

  function handleAnswer(key: string) {
    if (!q) return;
    setAnswers(a => ({ ...a, [q.id]: key }));
    setTimeout(() => {
      if (currentQ + 1 < sQuestions.length) {
        setCurrentQ(c => c + 1);
      } else if (currentSection + 1 < SECTIONS_ORDER.length) {
        setCurrentSection(s => s + 1);
        setCurrentQ(0);
      } else {
        finishExam();
      }
    }, 600);
  }

  async function finishExam() {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const total = Object.values(exam).reduce((s, arr) => s + arr.length, 0);
    const correct = Object.entries(answers).filter(([qId, ans]) => {
      const allQ = Object.values(exam).flat();
      const found = allQ.find(q => q.id === qId);
      return found?.answer === ans;
    }).length;
    const score = Math.round((correct / total) * 100);

    if (user) {
      await api.progress.save({
        userId: user.id, section: 'MOCK', score,
        total, correct, durationSeconds: duration,
      }).catch(() => {});
    }
    setDone(true);
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Spinner size={40} /><p className="text-slate-500">Préparation de l&apos;examen...</p>
    </div>
  );

  if (done) {
    const total = Object.values(exam).reduce((s, arr) => s + arr.length, 0);
    const correct = Object.entries(answers).filter(([qId, ans]) => {
      const allQ = Object.values(exam).flat();
      const found = allQ.find(q => q.id === qId);
      return found?.answer === ans;
    }).length;
    const score = Math.round((correct / total) * 100);

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-cyan-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center space-y-6"
        >
          <SophieAvatar mood={score >= 70 ? 'celebrate' : score >= 50 ? 'happy' : 'encourage'} size="md" showMessage={true} />
          <h2 className="text-2xl font-black text-slate-800">Examen terminé !</h2>
          <ScoreRing score={score} size={120} />
          <div className="grid grid-cols-2 gap-3 text-sm">
            {SECTIONS_ORDER.map(s => {
              const sQ = exam[s] ?? [];
              const sCorrect = sQ.filter(q => answers[q.id] === q.answer).length;
              const sScore = sQ.length ? Math.round((sCorrect / sQ.length) * 100) : 0;
              return (
                <div key={s} className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">{SECTION_ICONS[s]} {s}</span>
                  <span className="font-black text-indigo-600">{sScore}/100</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={loadExam} className="flex-1 bg-indigo-50 text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-100 transition-colors">
              Nouvel examen
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
      <div className="bg-white/80 backdrop-blur border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-red-500 transition-colors text-sm">✕ Quitter</button>
          <div className="flex-1 flex gap-2">
            {SECTIONS_ORDER.map((s, i) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${i < currentSection ? 'bg-indigo-500' : i === currentSection ? 'bg-cyan-400' : 'bg-slate-200'}`} />
            ))}
          </div>
          <span className="text-xs text-slate-400">{answeredCount}/{totalQuestions}</span>
        </div>
        <div className="max-w-3xl mx-auto px-6 pb-2 flex gap-2">
          {SECTIONS_ORDER.map((s, i) => (
            <span key={s} className={`text-xs font-bold px-2 py-0.5 rounded-full ${i === currentSection ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}>
              {SECTION_ICONS[s]} {s}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-6 sm:pt-8 space-y-4 sm:space-y-6">
        <div className="flex justify-center">
          <SophieAvatar mood="explain" size="sm" showMessage={false} />
        </div>

        <motion.div
          key={`${sKey}-${currentQ}`}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-md border border-slate-100 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">{SECTION_ICONS[sKey]}</span>
            <span className="text-xs font-bold text-slate-500">{sKey} · Question {currentQ + 1}/{sQuestions.length}</span>
          </div>
          <p className="text-slate-800 font-semibold leading-relaxed">{q?.question}</p>
        </motion.div>

        {q?.options && (
          <div className="grid gap-3">
            {Object.entries(q.options).map(([key, val]) => {
              const isAnswered = !!answers[q.id];
              const isSelected = answers[q.id] === key;
              return (
                <motion.button
                  key={key}
                  onClick={() => !isAnswered && handleAnswer(key)}
                  disabled={isAnswered}
                  whileHover={!isAnswered ? { scale: 1.01 } : {}}
                  whileTap={!isAnswered ? { scale: 0.99 } : {}}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all flex items-center gap-3
                    ${isSelected ? 'border-indigo-400 bg-indigo-50 text-indigo-700' :
                      isAnswered ? 'border-slate-100 bg-slate-50 text-slate-400' :
                      'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-slate-700'}`}
                >
                  <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center
                    ${isSelected ? 'bg-indigo-400 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {key.toUpperCase()}
                  </span>
                  {String(val)}
                </motion.button>
              );
            })}
          </div>
        )}

        {!q?.options && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center text-slate-400 italic text-sm">
            Section {sKey} — La correction IA sera disponible après l&apos;examen.
            <div className="mt-3">
              <button
                onClick={() => handleAnswer('submitted')}
                className="bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold px-6 py-3 rounded-xl shadow"
              >
                Passer à la suite →
              </button>
            </div>
          </div>
        )}

        {scores && Object.keys(scores).length > 0 && null}
      </div>
    </div>
  );
}
